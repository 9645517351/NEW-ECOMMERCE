

document.addEventListener('DOMContentLoaded', function() {
    const email = document.getElementById('email');
    const emailError = document.getElementById('emailError');
    const password = document.getElementById('password');
    const passwordError = document.getElementById('passwordError');
    const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

    function validateEmail() {
        console.log('Validating email:', email.value);
        if (!emailPattern.test(email.value)) {
            emailError.style.display = 'block';
            return false; // Invalid email
        } else {
            emailError.style.display = 'none';
            return true; // Valid email
        }
    }

    function validatePassword() {
        if (password.value.length < 6) {
            passwordError.style.display = 'block';
            return false; // Invalid password
        } else {
            passwordError.style.display = 'none';
            return true; // Valid password
        }
    }

    function validateForm() {
        let isValid = true;

        // Email validation
        if (!validateEmail()) {
            isValid = false;
        }

        // Password validation
        if (!validatePassword()) {
            isValid = false;
        }

        return isValid;
    }

    // Function to display error message on blur event
    function displayEmailError() {
        if (!validateEmail()) {
            emailError.style.display = 'block';
        } else {
            emailError.style.display = 'none';
        }
    }

    // Add blur event listener to email input field
    email.addEventListener('blur', displayEmailError);

    document.getElementById('loginForm').addEventListener('submit', function(event) {
        // Prevent form submission if validation fails
        if (!validateForm()) {
            event.preventDefault();
        }
    });

    // Add event listener to login button
    const loginButton = document.querySelector('button[name="login"]');
    loginButton.addEventListener('click', function(event) {
        // Validate form fields on button click
        validateEmail();
        validatePassword();
    });
});
