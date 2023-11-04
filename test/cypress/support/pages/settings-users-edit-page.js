const SettingsUsersEditPage = {
    url: Cypress.env("baseUrl") + "/settings/users/edit",
    usernameInput: '[data-cy="username-input"]',
    newPassWordInput: '[data-cy="password-input"]',
    newPasswordRepeatInput: '[data-cy="password-repeat-input"]',
    submitEditUserForm: '[data-cy="submit-create-admin-form"]',
    submitNewPasswordForm: '[data-cy="submit-new-password-form"]',
    activeStatus: '[data-cy="active-status"]',
};