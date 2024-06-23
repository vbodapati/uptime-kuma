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
    if (process.platform !== "linux" || process.arch !== "x64") {
        if (process.env.HEADLESS_TEST) {
            return;
        }
        console.log("current platform may not support running docker containers. Make sure you have docker installed to run this testcase");
    }

    const container = await new HiveMQContainer().start();
    const conn = container.getConnectionString();
    await t.test("timeouts work", async (_t) => {
        const now = new Date();
        try {
            await runMqttCheck(conn, "1", "0");
            assert.fail("timeouts are not thrown despite expecting a non-existing message");
        } catch (_e) {}
        const elapsedTimeMs = (new Date()).getTime() - now.getTime();
        assert.strictEqual(elapsedTimeMs >= 1000 && elapsedTimeMs <= 3000, true, `${elapsedTimeMs} is not in the expected range`);
    });
    await t.test("valid keywords (type=default)", async (_t) => {
        await publishMqtt(conn, "-> KEYWORD <-");
        const heartbeat = await runMqttCheck(conn, "KEYWORD", null);
        assert.strictEqual(heartbeat.status, UP);
        assert.strictEqual(heartbeat.msg, "Topic: test; Message: -> KEYWORD <-");
    });
    await t.test("valid keywords (type=keyword)", async (_t) => {
        await publishMqtt(conn, "-> KEYWORD <-");
        const heartbeat = await runMqttCheck(conn, "KEYWORD", "keyword");
        assert.strictEqual(heartbeat.status, UP);
        assert.strictEqual(heartbeat.msg, "Topic: test; Message: -> KEYWORD <-");
    });
    await t.test("invalid keywords (type=default)", async (_t) => {
        await publishMqtt(conn, "-> KEYWORD <-");
        try {
            await runMqttCheck(conn, "NOT_PRESENT", null);
            assert.fail("keywords without a keyword should have thrown");
        } catch (error) {
            assert.strictEqual(error.message, "Message Mismatch - Topic: test; Message: -> KEYWORD <-");
        }
    });
    await t.test("invalid keyword (type=keyword)", async (_t) => {
        await publishMqtt(conn, "-> KEYWORD <-");
        try {
            await runMqttCheck(conn, "NOT_PRESENT", "keyword");
            assert.fail("keywords without a keyword should have thrown");
        } catch (error) {
            assert.strictEqual(error.message, "Message Mismatch - Topic: test; Message: -> KEYWORD <-");
        }
    });
    await t.test("valid json-query", async (_t) => {
        // works because the monitors' jsonPath is hard-coded to "firstProp"
        await publishMqtt(conn, "{\"firstProp\":\"present\"}");
        const heartbeat = await runMqttCheck(conn, "present", "json-query");
        assert.strictEqual(heartbeat.status, UP);
        assert.strictEqual(heartbeat.msg, "Topic: test; Message: -> KEYWORD <-");
        assert.strictEqual(heartbeat.status, UP);
        assert.strictEqual(heartbeat.msg, "Message received, expected value is found");
    });
    await t.test("invalid (because query fails) json-query", async (_t) => {
        // works because the monitors' jsonPath is hard-coded to "firstProp"
        await publishMqtt(conn, "{}");
        try {
            const heartbeat = await runMqttCheck(conn, "[not_relevant]", "json-query");
            assert.fail("json-query an empty message should have thrown, heartbeat=" + JSON.stringify(heartbeat));
        } catch (error) {
            assert.strictEqual(error.message, "Message received but value is not equal to expected value, value was: [undefined]");
        }
    });
    await t.test("invalid (because successMessage fails) json-query", async (_t) => {
        // works because the monitors' jsonPath is hard-coded to "firstProp"
        await publishMqtt(conn, "{\"firstProp\":\"present\"}");
        try {
            const heartbeat = await runMqttCheck(conn, "[wrong_success_messsage]", "json-query");
            assert.fail("json-query an expecting the wrong message should have thrown, heartbeat=" + JSON.stringify(heartbeat));
        } catch (error) {
            assert.strictEqual(error.message, "Message received but value is not equal to expected value, value was: [present]");
        }
    });
    await container.stop();
});
