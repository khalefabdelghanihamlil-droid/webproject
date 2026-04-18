<?php
/**
 * logout.php
 * Destroys the current session and redirects the user back to the login page.
 */
session_start();
session_unset();    // Remove all session variables
session_destroy();  // Destroy the session data

header("Location: index.html");
exit();
?>
