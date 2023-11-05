const settingsUsersEditPage = require('../pages/settings-users-edit-page');

class EditUserTask{
    fillAndSubmitNewUserNameForm(username){
        cy.get(settingsUsersEditPage.SettingsUsersEditPage.usernameInput).clear();
        cy.get(settingsUsersEditPage.SettingsUsersEditPage.usernameInput).type(username);
        cy.get(settingsUsersEditPage.SettingsUsersEditPage.submitEditUserNameForm).click();
    }
    fillAndSubmitNewPasswordForm(password, newPassword, newPasswordRepeat){
        cy.get(settingsUsersEditPage.SettingsUsersEditPage.currentPassWordInput).type(password);
        cy.get(settingsUsersEditPage.SettingsUsersEditPage.newPassWordInput).type(newPassword);
        cy.get(settingsUsersEditPage.SettingsUsersEditPage.newPasswordRepeatInput).type(newPasswordRepeat);
        cy.get(settingsUsersEditPage.SettingsUsersEditPage.submitNewPasswordForm).click();
    }
    inactivateUser(){
        cy.get(settingsUsersEditPage.SettingsUsersEditPage.activeStatus).uncheck();
    }
}
exports.EditUserTask = EditUserTask;