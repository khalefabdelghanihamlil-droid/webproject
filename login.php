<?php
/**
 * login.php
 * Handles POST form submission from index.html
 * Checks credentials against the `account` table in ecom_db
 * Redirects to main.html on success, back to index.html?error=1 on failure
 */

session_start();
include "db.php"; // Connect to ecom_db

if ($_SERVER["REQUEST_METHOD"] == "POST") {

    // Retrieve and sanitise form input
    $login = trim($_POST["login"]);
    $password = trim($_POST["password"]);

    // Select only the 'login' column — the account table has no 'id' column
    $stmt = $conn->prepare("SELECT login FROM account WHERE login = ? AND password = ?");
    $stmt->bind_param("ss", $login, $password);
    $stmt->execute();
    $stmt->store_result();

    if ($stmt->num_rows > 0) {
        // Credentials are correct — store session and redirect to catalog
        $_SESSION["login"] = $login;
        header("Location: main.html");
        exit();
    } else {
        // Wrong credentials — redirect back with error flag
        header("Location: index.html?error=1");
        exit();
    }

    $stmt->close();
}

$conn->close();
?>