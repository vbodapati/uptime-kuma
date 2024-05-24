const test = require("node:test");
const assert = require("node:assert");
const { HiveMQContainer } = require("@testcontainers/hivemq");
const mqtt = require("mqtt");
const { MqttMonitorType } = require("../../server/monitor-types/mqtt");
const { UP, PENDING } = require("../../src/util");

/**
 * Runs an MQTT check with the given parameters.
 * @param {string} connectionString - The MQTT connection string.
 * @param {string} expected - The expected value or success message for the MQTT check.
 * @param {string} mqttCheckType - The type of the MQTT check.
 * @returns {object} - The heartbeat object after running the MQTT check.
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
 * Publishes a message to an MQTT broker using the given connection details.
 * @param {string} conn - The connection details for the MQTT broker.
 * @param {string} message - The message to publish.
 * @returns {Promise<void>} - A Promise that resolves when the message is successfully published.
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
        assert.notEqual(UP, PENDING);
        await publishMqtt(conn, "message");
    });
    await container.stop();
});
