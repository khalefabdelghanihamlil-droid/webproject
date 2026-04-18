<?php
/**
 * save_order.php
 * Receives the cart as a JSON POST body and saves each item into the orders table.
 * Expected JSON: { "items": [ { "id", "name", "price", "quantity", "category" } ], "total" }
 */

session_start();
header('Content-Type: application/json');
include "db.php";

/* --- Only accept POST --- */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
    exit();
}

/* --- Read and decode JSON body --- */
$body = file_get_contents('php://input');
$data = json_decode($body, true);

if (!$data || empty($data['items'])) {
    echo json_encode(['success' => false, 'message' => 'Cart is empty']);
    exit();
}

/* ---------------------------------------------------
   Find the customer_id for the logged-in user.
   Strategy: match account login to customer name.
   Falls back to account.id if no customer row found.
   --------------------------------------------------- */
$customer_id = 1; // default fallback

if (isset($_SESSION['login'])) {
    $login = $_SESSION['login'];

    // Try to find a matching customer by name
    $stmt = $conn->prepare("SELECT id FROM customer WHERE name = ? LIMIT 1");
    $stmt->bind_param("s", $login);
    $stmt->execute();
    $stmt->bind_result($cid);
    if ($stmt->fetch()) {
        $customer_id = $cid;
    }
    $stmt->close();

    // If still default, try to use the account's own id
    if ($customer_id === 1) {
        $stmt2 = $conn->prepare("SELECT id FROM account WHERE login = ? LIMIT 1");
        $stmt2->bind_param("s", $login);
        $stmt2->execute();
        $stmt2->bind_result($aid);
        if ($stmt2->fetch()) {
            $customer_id = $aid;
        }
        $stmt2->close();
    }
}

/* ---------------------------------------------------
   Insert each cart item as a row in the orders table.
   product_id is resolved by looking up the product name
   so it works regardless of client-side ID format.
   --------------------------------------------------- */
$errors = 0;

foreach ($data['items'] as $item) {
    $product_id  = 0;
    $quantity    = intval($item['quantity'] ?? 1);
    $unit_price  = floatval($item['price'] ?? 0);
    $total_price = $unit_price * $quantity;
    $name        = $item['name'] ?? '';

    // Look up the product id by name
    $ps = $conn->prepare("SELECT id FROM product WHERE name = ? LIMIT 1");
    $ps->bind_param("s", $name);
    $ps->execute();
    $ps->bind_result($pid);
    if ($ps->fetch()) {
        $product_id = $pid;
    }
    $ps->close();

    // Insert the order row
    $ins = $conn->prepare(
        "INSERT INTO orders (customer_id, product_id, quantity, total_price) VALUES (?, ?, ?, ?)"
    );
    $ins->bind_param("iiid", $customer_id, $product_id, $quantity, $total_price);
    if (!$ins->execute()) {
        $errors++;
    }
    $ins->close();
}

$conn->close();

if ($errors === 0) {
    echo json_encode(['success' => true, 'message' => 'Order saved successfully']);
} else {
    echo json_encode(['success' => false, 'message' => "$errors item(s) failed to save"]);
}
?>
