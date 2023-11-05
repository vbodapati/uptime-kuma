const user_data = require('../const/user-data');
const login_component = require('../components/login-component');   

class LoginTask {
    fillAndSubmitLoginForm(username, password) {
        // check if username and password are provided else use default user
        if (username && password) {
            cy.get(login_component.LoginCompónent.userNameInput).type(username); 
            cy.get(login_component.LoginCompónent.passWordInput).type(password);
        } else {
            cy.get(login_component.LoginCompónent.userNameInput).type(user_data.DEFAULT_USER_DATA.username); 
            cy.get(login_component.LoginCompónent.passWordInput).type(user_data.DEFAULT_USER_DATA.password);
        }
        
        cy.get(login_component.LoginCompónent.submitLoginForm).click();
    }
}
exports.LoginTask = LoginTask;