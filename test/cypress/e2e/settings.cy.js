const actor = require("../support/actors/actor");
const userData = require("../support/const/user-data");
const settingsUsersAddPage = require("../support/pages/settings-users-add-page");
const settingsUsersEditPage = require("../support/pages/settings-users-edit-page");

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

describe("login with new user then edit info", () => {
    before(() => {
        cy.visit('/');
        actor.actor.loginTask.fillAndSubmitLoginForm(userData.ADMIN_USER_DATA.username, userData.ADMIN_USER_DATA.password);
    });
    it("user can edit its data with new created account", () => {
        cy.visit(`/settings/users/edit/${userData.ADMIN_USER_DATA.id}`);
    
        actor.actor.editUserTask.fillAndSubmitNewUserNameForm(userData.ADMIN_USER_DATA.username + "new");
        actor.actor.editUserTask.fillAndSubmitNewPasswordForm(userData.ADMIN_USER_DATA.password, userData.ADMIN_USER_DATA.password + "new", userData.ADMIN_USER_DATA.password + "new");
        
        cy.wait(1000);
        cy.visit('/');
        actor.actor.loginTask.fillAndSubmitLoginForm(userData.ADMIN_USER_DATA.username + "new", userData.ADMIN_USER_DATA.password + "new");
        cy.visit(`/settings/users/edit/${userData.DEFAULT_USER_DATA.id}`);
        actor.actor.editUserTask.inactivateUser();
        cy.wait(2000);

    
    });
    
});
describe("Inactivated user cannot login", () => {
    it("user cannot login with inactivated account", () => {
        cy.visit('/');
        actor.actor.loginTask.fillAndSubmitLoginForm(userData.DEFAULT_USER_DATA.username, userData.DEFAULT_USER_DATA.password);
        cy.get('.alert')
            .should("be.visible")
            .and("contain.text", "Incorrect username or password.");
    });
});