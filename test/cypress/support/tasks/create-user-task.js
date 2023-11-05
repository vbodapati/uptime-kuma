const settingsUsersAddPage = require('../pages/settings-users-add-page');

class CreateUserTask{
    fillAndSubmitNewUserForm(username, password, passwordRepeat){
        cy.get(settingsUsersAddPage.SettingsUsersAddPage.usernameInput).type(username);
        cy.get(settingsUsersAddPage.SettingsUsersAddPage.passWordInput).type(password);
        cy.get(settingsUsersAddPage.SettingsUsersAddPage.passwordRepeatInput).type(passwordRepeat);
        cy.get(settingsUsersAddPage.SettingsUsersAddPage.submitNewUserForm).click();
    }
}
exports.CreateUserTask = CreateUserTask;