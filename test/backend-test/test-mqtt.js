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
const { UP, PENDING } = require("../../src/util");

/**
 * Runs an MQTT test with the
 * @param  {string} mqttSuccessMessage the message that the monitor expects
 * @param {null|"keyword"|"json-query"} mqttCheckType the type of check we perform
 * @param {string} receivedMessage what message is recieved from the mqtt channel
 * @param {(h:Heartbeat)=>{}} onSuccess  executed if the check succeeds
 * @param {(e:Error)=>{}} onError executed if the check fails
 * @returns {void}
 */
function testMqtt(mqttSuccessMessage, mqttCheckType, receivedMessage, onSuccess, onError) {
    console.info("launching mqtt container");
    new HiveMQContainer().start().then((hiveMQContainer) => {
        const connectionString = hiveMQContainer.getConnectionString();
        const mqttMonitorType = new MqttMonitorType();
        const monitor = {
            jsonPath: "firstProp", // always return firstProp for the json-query monitor
            hostname: connectionString.split(":", 2).join(":"),
            mqttTopic: "test",
            port: connectionString.split(":")[2],
            mqttUsername: null,
            mqttPassword: null,
            interval: 20, // controls the timeout
            mqttSuccessMessage: mqttSuccessMessage, // for keywords
            expectedValue: mqttSuccessMessage, // for json-query
            mqttCheckType: mqttCheckType,
        };
        const heartbeat = {
            msg: "",
            status: PENDING,
        };
        mqttMonitorType.check(monitor, heartbeat, {})
            .then(() => {
                testMqttClient.end();
                hiveMQContainer.stop();
            })
            .then(() => onSuccess(heartbeat), onError);

        const testMqttClient = mqtt.connect(hiveMQContainer.getConnectionString());
        testMqttClient.on("connect", () => {
            testMqttClient.subscribe("test", (error) => {
                if (!error) {
                    testMqttClient.publish("test", receivedMessage);
                }
            });
        });
    });
}

test("MqttMonitorType - valid keywords (type=default)", (t, done) => {
    testMqtt("KEYWORD", null, "-> KEYWORD <-",
        (heartbeat) => {
            assert.strictEqual(heartbeat.status, UP);
            assert.strictEqual(heartbeat.msg, "Topic: test; Message: -> KEYWORD <-");
            done();
        },
        e => done(e));
});

test("MqttMonitorType - valid keywords (type=keyword)", (t, done) => {
    testMqtt("KEYWORD", "keyword", "-> KEYWORD <-",
        (heartbeat) => {
            assert.strictEqual(heartbeat.status, UP);
            assert.strictEqual(heartbeat.msg, "Topic: test; Message: -> KEYWORD <-");
            done();
        },
        e => done(e));
});
test("MqttMonitorType - invalid keywords (type=default)", (t, done) => {
    testMqtt("NOT_PRESENT", null, "-> KEYWORD <-",
        () => done(new Error("keywords without a keyword should have thrown")),
        error => {
            assert.strictEqual(error.message, "Message Mismatch - Topic: test; Message: -> KEYWORD <-");
            done();
        });
});
test("MqttMonitorType - invalid keyword (type=keyword)", (t, done) => {
    testMqtt("NOT_PRESENT", "keyword", "-> KEYWORD <-",
        () => done(new Error("keywords without a keyword should have thrown")),
        error => {
            assert.strictEqual(error.message, "Message Mismatch - Topic: test; Message: -> KEYWORD <-");
            done();
        });
});
test("MqttMonitorType - valid json-query", (t, done) => {
    // works because the monitors' jsonPath is hard-coded to "firstProp"
    testMqtt("present", "json-query", "{\"firstProp\":\"present\"}",
        (heartbeat) => {
            assert.strictEqual(heartbeat.status, UP);
            assert.strictEqual(heartbeat.msg, "Message received, expected value is found");
            done();
        },
        e => done(e));
});
test("MqttMonitorType - invalid (because query fails) json-query", (t, done) => {
    // works because the monitors' jsonPath is hard-coded to "firstProp"
    testMqtt("[not_relevant]", "json-query", "{}",
        (heartbeat) => done(new Error("json-query an empty message should have thrown, heartbeat=" + JSON.stringify(heartbeat))),
        error => {
            assert.strictEqual(error.message, "Message received but value is not equal to expected value, value was: [undefined]");
            done();
        });
});
test("MqttMonitorType - invalid (because successMessage fails) json-query", (t, done) => {
    // works because the monitors' jsonPath is hard-coded to "firstProp"
    testMqtt("[wrong_success_messsage]", "json-query", "{\"firstProp\":\"present\"}",
        () => done(new Error("json-query an empty message should have thrown")),
        error => {
            assert.strictEqual(error.message, "Message received but value is not equal to expected value, value was: [present]");
            done();
        });
});
