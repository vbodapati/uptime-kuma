exports.SettingsUsersEditPage = {
    url: Cypress.env("baseUrl") + "/settings/users/edit",
    usernameInput: '[data-cy="edit-username-input"]',
    currentPassWordInput: '[data-cy="edit-current-password-input"]',
    newPassWordInput: '[data-cy="edit-new-password-input"]',
    newPasswordRepeatInput: '[data-cy="edit-new-password-repeat-input"]',
    submitEditUserNameForm: '[data-cy="submit-edit-username-form"]',
    submitNewPasswordForm: '[data-cy="submit-edit-password-form"]',
    activeStatus: '[data-cy="edit-active-checkbox"]',
};