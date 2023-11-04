const setupTask = require("../tasks/setup-task");
const loginTask = require("../tasks/login-task");
const createUserTask = require("../tasks/create-user-task");
class Actor {
    constructor() {
        this.setupTask = new setupTask.SetupTask();
        this.loginTask = new loginTask.LoginTask();
        this.createUserTask = new createUserTask.CreateUserTask();
    }
}
const actor = new Actor();
exports.actor = actor;
