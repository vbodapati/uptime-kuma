const test = require("node:test");
const assert = require("node:assert");
const { HiveMQContainer } = require("@testcontainers/hivemq");
const mqtt = require("mqtt");
const { MqttMonitorType } = require("../../server/monitor-types/mqtt");
const { UP, PENDING } = require("../../src/util");

/**
 * @param connectionString
 * @param expected
 * @param mqttCheckType
 */
async function runMqttCheck(connectionString, expected, mqttCheckType) {
    const mqttMonitorType = new MqttMonitorType();
    const monitor = {
        jsonPath: "firstProp", // always return firstProp for the json-query monitor
        hostname: connectionString.split(":", 2).join(":"),
        mqttTopic: "test",
        port: connectionString.split(":")[2],
        mqttUsername: null,
        mqttPassword: null,
        interval: 2, // controls the timeout
        mqttSuccessMessage: expected, // for keywords
        expectedValue: expected, // for json-query
        mqttCheckType: mqttCheckType,
    };
    const heartbeat = {
        msg: "",
        status: PENDING,
    };
    await mqttMonitorType.check(monitor, heartbeat, {});
    return heartbeat;
}

/**
 * @param conn
 * @param message
 */
async function publishMqtt(conn, message) {
    await new Promise((resolve, reject) => {
        const testMqttClient = mqtt.connect(conn);
        testMqttClient.on("connect", () => {
            testMqttClient.subscribe("test", (error) => {
                if (!error) {
                    testMqttClient.publish("test", message);
                    testMqttClient.end();
                    resolve();
                } else {
                    reject(error);
                }
            });
        });
    });
}

test("MqttMonitorType", async (t) => {
    let container = await (new HiveMQContainer()).start();
    let conn = container.getConnectionString();
    console.log("conn", conn);
    await t.test("timeouts work", async (_t) => {
        let now = new Date();
        try {
            await runMqttCheck(conn, "1", "0");
            assert.fail("timeouts are thrown");
        } catch (_e) {}
        let elapsedTimeSeconds = (new Date()).getTime() - now.getTime();
        assert.strictEqual(elapsedTimeSeconds > 1000, true);
    });
    await container.stop();
});
