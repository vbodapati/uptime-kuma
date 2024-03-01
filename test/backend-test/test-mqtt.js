const semver = require("semver");
let test;
const nodeVersion = process.versions.node;
if (semver.satisfies(nodeVersion, ">= 18")) {
    test = require("node:test");
} else {
    test = require("test");
}

const assert = require("node:assert");
const { HiveMQContainer } = require("@testcontainers/hivemq");
const mqtt = require("mqtt");
const { MqttMonitorType } = require("../../server/monitor-types/mqtt");
const { UP,
    PENDING
} = require("../../src/util");
test("MqttMonitorType - send messages can be recived", (t, done) => {
    console.info("launching mqtt container");
    new HiveMQContainer().start().then((hiveMQContainer) => {
        const testMqttClient = mqtt.connect(hiveMQContainer.getConnectionString());

        testMqttClient.on("message", (topic, message) => {
            assert.strictEqual(message.toString(), "Test Message");
            testMqttClient.end();
            done();
        });

        testMqttClient.on("connect", () => {
            testMqttClient.subscribe("test", (error) => {
                if (!error) {
                    testMqttClient.publish("test", "Test Message");
                }
            });
        });
    });
});
