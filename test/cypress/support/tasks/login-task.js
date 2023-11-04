const user_data = require('../const/user-data');
const login_component = require('../components/login-component');   

class LoginTask {
    fillAndSubmitLoginForm() {
        cy.get(login_component.LoginCompónent.userNameInput).type(user_data.DEFAULT_USER_DATA.username); 
        cy.get(login_component.LoginCompónent.passWordInput).type(user_data.DEFAULT_USER_DATA.password);
        cy.get(login_component.LoginCompónent.submitLoginForm).click();
    }
}
exports.LoginTask = LoginTask;