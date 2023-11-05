exports.SettingsUsersAddPage = {
    url: Cypress.env("baseUrl") + "/settings/users/add",
    usernameInput: '[data-cy="username-input"]',
    passWordInput: '[data-cy="password-input"]',
    passwordRepeatInput: '[data-cy="password-repeat-input"]',
    submitNewUserForm: '[data-cy="submit-create-admin-form"]',
};