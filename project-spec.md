# **Project Prompt: Telegram Coffee Shop Ordering Mini App**

## **1\. Project Overview**

I want to build a **Telegram Mini App for a coffee shop**, similar in concept to [@DurgerKingBot](https://t.me/durgerkingbot), where customers can browse products, customize their drinks and food, place orders through Telegram, and pay **in cash at the counter when collecting their orders**.

The system should include a customer-facing Telegram Mini App, a Telegram bot, a backend API, a database, and a separate admin dashboard for coffee-shop staff.

The project should use the **MEVN stack** and be designed as a practical, secure, maintainable coffee-shop ordering system.

## **2\. Technology Stack**

### **Frontend**

* **Vue 3** — Customer Mini App and Admin Dashboard  
* **Vite** — Frontend build tool  
* **Vue Router** — Navigation and routing  
* **Pinia** — Frontend state management  
* **TailwindCSS, [Lucide](https://lucide.dev/)** \- Styling  
* **Color Palette Summary**  
  **1\. Brand Accents (From Logo)**  
  * **Matcha Green (Primary Accent)**: `#517C38`  
    * *Use for:* Primary buttons, active tabs, main headings, selected navigation items.  
  * **Honey Amber (Secondary Accent)**: `#EFA823`  
    * *Use for:* Order status badges, "Popular" tags, star ratings, alert highlights.  
* **2\. Canvas & UI Neutrals**  
  * **Main Background**: `#FBFBF9` (Soft Warm Cream — keeps the app light without harsh glare)  
  * **Card & Panel Surface**: `#FFFFFF` (Pure White — product containers, sidebar, modals)  
  * **Borders & Dividers**: `#E5E7EB` (Subtle Light Gray)  
* **3\. Typography Colors**  
  * **Primary Text**: `#1F2937` (Dark Charcoal — easy to read for headings and labels)  
  * **Secondary Text**: `#6B7280` (Medium Slate Gray — subtext, prices, secondary info)

### **Backend**

* **Node.js** — Backend runtime  
* **Express.js** — REST API and business logic

### **Database**

* **MongoDB** — Products, customers, orders, and other business data

### **Communication**

* REST API between the frontends and backend  
* Telegram Bot API for bot commands and customer notifications  
* Optional Socket.IO for real-time order updates in a later phase

## **3\. System Architecture**

The system consists of three main components.

### **A. Telegram Bot**

The bot is the entry point for customers. Customers open the bot and tap an "Order Now" button to launch the Telegram Mini App.

The bot should send order-related notifications when appropriate.

### **B. Customer Telegram Mini App**

A mobile-first Vue 3 \+ Vite web application that runs inside Telegram.

Customers do not need to install a separate mobile application.

### **C. Admin Dashboard**

A separate Vue 3 \+ Vite web application that staff access through a browser to manage products, orders, customers, and sales.

Both frontends communicate with the same Express backend and MongoDB database.

**Architecture:**

Customer → Telegram Bot → Telegram Mini App → REST API → Express/Node.js → MongoDB

Staff → Admin Dashboard → REST API → Express/Node.js → MongoDB

## **4\. Customer Mini App Features**

### **Home Page**

* Coffee-shop branding and logo  
* Featured and popular products  
* Product categories  
* Promotions and announcements  
* Easy access to the menu and cart

### **Product Categories**

Examples:

* Coffee  
* Non-Coffee Drinks  
* Tea  
* Bakery  
* Desserts  
* Special Offers

Categories should be manageable through the admin dashboard.

### **Product Listing**

Each product should display:

* Product image  
* Name  
* Description  
* Price  
* Availability  
* Add-to-cart button

### **Product Details and Customization**

Customers should be able to customize products where applicable.

Example: Iced Latte

* Ice level: Normal, Less Ice, No Ice  
* Sugar level: 0%, 25%, 50%, 75%, 100%  
* Add-ons: Extra shot, syrup, whipped cream

Options and additional prices must be retrieved from the backend, not hard-coded into the frontend.

### **Shopping Cart**

Customers should be able to:

* Add and remove products  
* Change quantities  
* Review customizations and add-ons  
* View item prices and subtotals  
* View the order total  
* Return to the menu and continue shopping

### **Checkout**

The checkout process should be simple and require minimal steps.

Before placing an order, display:

* Order items and quantities  
* Selected customizations  
* Item prices  
* Subtotal  
* Discounts, if applicable  
* Final total  
* Customer's Telegram identity  
* Clear instructions to pay cash at the counter

Provide a **"Place Order"** button.

There must be **no online payment gateway, ABA PayWay integration, QR payment generation, or online payment processing**.

### **Order Confirmation**

After an order is successfully created, display:

* Unique order number  
* Order summary  
* Total amount due  
* Customer Telegram username, when available  
* Payment method: Cash at Counter  
* Payment status: Unpaid  
* Order status: Pending

Example:

Order \#ORD-1042

* 2 × Iced Latte  
* 1 × Croissant  
* Total: \$6.50  
* Payment: Cash at Counter  
* Payment Status: Unpaid  
* Order Status: Pending

Display a clear message:

"Your order has been placed successfully\! Please pay \$6.50 in cash at the counter when collecting your order."

Customers should be able to view their current and previous orders.

## **5\. Customer Telegram Identity and Order Tracking**

**Every order must store the customer's Telegram identity wherever the relevant information is available.**

Use Telegram Mini App initialization data to identify the customer and verify their identity on the backend.

Store the following customer information:

* Telegram user ID — primary identifier for linking Telegram activity to a customer  
* Telegram username — optional because users may not have one  
* First name  
* Last name, if available  
* Internal customer database ID  
* Order number  
* Order creation date and time

The order should contain a customer reference and a snapshot of the relevant Telegram identity at the time the order was placed.

Example order data:

{

  "orderNumber": "ORD-1042",

  "customer": {

    "telegramUserId": "123456789",

    "telegramUsername": "coffee\_customer",

    "firstName": "Dara",

    "lastName": "Hou"

  },

  "items": \[

    {

      "productName": "Iced Latte",

      "quantity": 2,

      "unitPrice": 2.5,

      "customizations": {

        "size": "Medium",

        "ice": "Less",

        "sugar": "50%"

      }

    }

  \],

  "total": 5.0,

  "paymentMethod": "cash\_at\_counter",

  "paymentStatus": "unpaid",

  "orderStatus": "pending",

  "createdAt": "server-generated timestamp"

}

This is an illustrative data structure; the actual database schema should be designed appropriately.

### **Important Identity Requirements**

* Use Telegram user ID as the stable identifier, not the username.  
* Telegram usernames can change or be absent.  
* Verify Telegram Mini App authentication data on the backend.  
* Never trust customer identity fields supplied by the frontend without verification.  
* Associate each order with the authenticated customer.  
* Allow staff to search orders by order number, Telegram username, Telegram user ID, or customer name.  
* Keep order history linked to the same Telegram user ID when the username changes.  
* Only show customers their own orders.  
* Restrict customer data and order history to authorized staff.

The purpose is to make orders easy to identify, track, and retrieve in the future.

## **6\. Order Status Management**

Maintain order status separately from payment status.

### **Order Status**

Use a workflow such as:

* Pending — order placed and awaiting staff confirmation  
* Confirmed — staff accepted the order  
* Preparing — preparation has started  
* Ready — order is ready for collection  
* Completed — customer collected the order  
* Cancelled — order was cancelled

### **Payment Status**

Use:

* Unpaid  
* Paid  
* Refunded, if refunds become relevant later

The initial payment method is always cash at the counter.

When the customer places an order, its payment status must be **Unpaid**. Staff should mark it as **Paid** only after actually receiving the cash.

Completing an order and receiving payment are separate actions. Do not automatically mark an order as paid simply because it is ready or completed.

## **7\. Admin Dashboard**

Build a separate staff dashboard using Vue 3 \+ Vite.

### **Dashboard Overview**

Display:

* Today's orders  
* Pending orders  
* Orders being prepared  
* Orders ready for collection  
* Completed orders  
* Unpaid orders  
* Today's sales  
* Popular products

Sales calculations should clearly distinguish completed/paid transactions from orders that are still unpaid or cancelled.

### **Product Management**

Staff should be able to:

* Create, edit, and deactivate products  
* Manage product names, descriptions, images, and prices  
* Assign categories  
* Manage sizes, sugar levels, ice levels, and add-ons  
* Set product availability  
* Temporarily mark products as sold out

### **Category Management**

* Create and edit categories  
* Reorder categories  
* Activate or deactivate categories

### **Order Management**

Staff should be able to:

* View incoming orders  
* View complete order details  
* Search by order number  
* Search by Telegram username  
* Search by Telegram user ID  
* Search by customer name  
* Filter orders by date, order status, and payment status  
* Confirm or cancel orders  
* Update preparation status  
* Mark orders as ready  
* Mark orders as completed  
* Mark cash payments as received  
* View historical orders

Example:

Order \#ORD-1042

Customer: @coffee\_customer  
Telegram ID: 123456789

Items:

* 2 × Iced Latte  
* 1 × Croissant

Total: \$6.50

Payment Method: Cash at Counter  
Payment Status: Unpaid  
Order Status: Pending

Staff actions:

* Confirm Order  
* Start Preparing  
* Mark Ready  
* Mark Completed  
* Mark Payment Received  
* Cancel Order

Only show actions that are valid for the order's current state. Record payment updates and relevant status changes for accountability.

### **Customer Management**

Staff should be able to:

* Search customers by Telegram username or Telegram user ID  
* View a customer's order history  
* View total orders  
* View total spending based on actual paid orders  
* Identify repeat customers

Avoid collecting unnecessary personal information.

### **Inventory and Promotions**

Design the system so it can support:

* Product availability and basic stock management  
* Discounts and promotions  
* Promo codes  
* Sales reports

These can be implemented after the core ordering workflow.

## **8\. Database Design**

Use MongoDB collections such as:

* `users`  
* `products`  
* `categories`  
* `orders`  
* `admins`  
* `promotions`  
* `inventory`, if needed

Orders should preserve historical product names, prices, selected options, add-ons, quantities, discounts, and totals at the time of ordering.

Do not rely only on current product records to display historical orders because product information may change later.

Store timestamps for order creation, confirmation, preparation, readiness, completion, and payment when applicable.

## **9\. REST API**

Create a structured REST API.

### **Authentication**

* `POST /api/auth/telegram`  
* `POST /api/auth/admin/login`

### **Products**

* `GET /api/products`  
* `GET /api/products/:id`  
* `POST /api/products`  
* `PUT /api/products/:id`  
* `DELETE /api/products/:id`

### **Categories**

* `GET /api/categories`  
* `POST /api/categories`  
* `PUT /api/categories/:id`  
* `DELETE /api/categories/:id`

### **Orders**

* `POST /api/orders`  
* `GET /api/orders/my-orders`  
* `GET /api/orders/:id`  
* `GET /api/admin/orders`  
* `PATCH /api/admin/orders/:id/status`  
* `PATCH /api/admin/orders/:id/payment-status`

### **Customers**

* `GET /api/admin/customers`  
* `GET /api/admin/customers/:id`  
* `GET /api/admin/customers/:id/orders`

These are suggested endpoints; refine them based on the final implementation.

All administrative routes must require appropriate authentication and authorization. Customers must only be able to access their own orders.

## **10\. Security and Business Rules**

The backend must be the source of truth for:

* Customer identity  
* Product prices  
* Product availability  
* Discounts  
* Order totals  
* Order status  
* Payment status  
* Staff permissions

The backend must:

* Verify Telegram Mini App initialization data.  
* Calculate prices and totals server-side.  
* Validate all product IDs, options, quantities, and availability.  
* Prevent unauthorized access to orders.  
* Protect admin endpoints.  
* Validate inputs and handle errors properly.  
* Use environment variables for secrets.  
* Apply appropriate rate limiting and CORS configuration.  
* Prevent duplicate order submissions where practical.  
* Record important order and payment-status changes.

No payment gateway or online payment verification is required for the initial version.

## **11\. Final Requirements**

* Use the MEVN stack.  
* Build one customer-facing interface that runs inside Telegram.  
* Build a separate admin dashboard for staff.  
* Use one shared backend and database.  
* Customers place orders in Telegram and pay cash at the counter.  
* Store Telegram user ID and username with each order whenever available.  
* Support future customer identification and order searching.  
* Keep order status separate from payment status.  
* Mark payment as received only when staff confirms the cash was collected.  
* Prioritize a simple mobile experience, secure APIs, accurate order records, and maintainable code.  
* Start with the MVP and avoid unnecessary complexity.

The intended customer workflow is:

**Telegram → Open Mini App → Browse Menu → Customize Products → Add to Cart → Checkout → Place Order → Receive Order Number → Pay Cash at Counter → Collect Order.**

