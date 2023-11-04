const actor = require("../support/actors/actor");
const userData = require("../support/const/user-data");
const settingsUsersAddPage = require("../support/pages/settings-users-add-page");

describe("user can create a new account on settings page", () => {
    before(() => {
        cy.visit("/settings/users/add");
        actor.actor.loginTask.fillAndSubmitLoginForm();
    });
    it("user cannot create new account with same", () => {
        cy.url().should("be.equal", settingsUsersAddPage.SettingsUsersAddPage.url);
        actor.actor.createUserTask.fillAndSubmitNewUserForm(userData.ADMIN_USER_DATA.username, userData.ADMIN_USER_DATA.password, userData.DEFAULT_USER_DATA.password);
        cy.get('[role="alert"]')
            .should("be.visible")
            .and("contain.text", "Added Successfully.");
    });
});

describe("logout and login with new user", () => {
    before(() => {
        cy.visit('/');
        actor.actor.loginTask.fillAndSubmitLoginForm(userData.ADMIN_USER_DATA.username, userData.ADMIN_USER_DATA.password);
    });
    it("user can edit its data with new created account", () => {
        cy.visit(`/settings/users/edit/${userData.ADMIN_USER_DATA.id}`);

    });
});