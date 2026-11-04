<div align="center">

# 🏠 HomeNest — Home Appliance E-Commerce

**A full-stack online store for home appliances & furniture, built with Node.js, Express and EJS — featuring real-time updates, an admin dashboard, and PDF invoices.**

![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express&logoColor=white)
![EJS](https://img.shields.io/badge/EJS-Templates-B4CA65?style=for-the-badge)
![WebSocket](https://img.shields.io/badge/WebSocket-Real--time-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![License](https://img.shields.io/badge/License-ISC-blue?style=for-the-badge)

</div>

---

## 📖 Overview

**HomeNest** is a complete e-commerce web application for a home appliance store based in Dhaka, Bangladesh. Customers can browse products, search instantly, manage a cart, place orders and download a professional PDF invoice. Admins get a dedicated panel to manage inventory and review every sale — and every connected browser updates **live** through WebSockets, with no manual refresh.

The project uses a lightweight **JSON file-based data store**, so it runs anywhere with zero database setup.

---

## ✨ Features

### 🛍️ Customer
- **Product catalog** with images, categories, prices and descriptions
- **Instant live search** across product name, category and description
- **Shopping cart** — add, decrease quantity, remove item, with AJAX updates (no page reload)
- **Secure session-based authentication** — register, login, logout
- **Checkout flow** with customer name, phone, address and payment method (Cash on Delivery)
- **Order confirmation page** and **downloadable PDF invoice** (generated with PDFKit)

### 🛠️ Admin
- **Inventory management** — create, update and delete products
- **Image upload** for products (Multer)
- **Sales log** — full order history, newest first
- **Role-based access control** — admin-only routes are protected by middleware

### ⚡ Real-time
- **WebSocket broadcasting** — product changes and new orders trigger an automatic refresh on every connected client

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js |
| **Backend Framework** | Express 5 |
| **Templating** | EJS |
| **Real-time** | ws (WebSocket) |
| **Sessions** | express-session |
| **File Uploads** | Multer |
| **PDF Generation** | PDFKit |
| **Frontend** | HTML5, CSS3, Vanilla JS, jQuery |
| **Data Storage** | JSON files |
| **Dev Tooling** | Nodemon |

---

## 📁 Project Structure

```
Project_NodeJs/
├── app.js                  # Express server, routes, WebSocket, PDF invoice
├── package.json
├── data/
│   ├── products.json       # Product catalog
│   ├── sales.json          # Order / sales history
│   └── users.json          # Registered users
├── views/
│   ├── home.ejs            # Storefront
│   ├── dashboard.ejs       # Cart & checkout
│   ├── checkout-success.ejs
│   ├── login.ejs
│   ├── register.ejs
│   ├── admin-inventory.ejs # Admin product management
│   ├── sales-log.ejs       # Admin sales history
│   └── partials/
│       ├── header.ejs
│       └── footer.ejs
├── public/                 # Static assets (logo)
├── public1/                # Static JS (jQuery)
├── Images/                 # Source product images
└── uploads/                # Uploaded product images
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) installed on your machine
- npm (comes with Node.js)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/<your-repo-name>.git

# 2. Move into the project folder
cd <your-repo-name>

# 3. Install dependencies
npm install

# 4. Start the server
npm start
```

For development with auto-reload:

```bash
npm run dev
```

Then open **http://localhost:3030** in your browser.

---

## 🔐 Admin Access

For demo purposes, registering an account with the username **`admin`** automatically grants the **admin** role.

1. Go to `/register` and create a user named `admin`
2. Log in at `/login`
3. Open `/admin/inventory` to manage products or `/sales` to view orders

---

## 🗺️ Routes Overview

### Pages
| Method | Route | Access | Description |
|---|---|---|---|
| GET | `/` | Public | Storefront |
| GET | `/register` · `/login` · `/logout` | Public | Authentication |
| GET | `/cart` | Customer | Cart & checkout |
| GET | `/checkout-success` | Customer | Order confirmation |
| GET | `/invoice/download` | Customer | Download PDF invoice |
| GET | `/admin/inventory` | Admin | Manage products |
| GET | `/sales` | Admin | Sales log |

### Actions & API
| Method | Route | Description |
|---|---|---|
| POST | `/cart/add` · `/cart/remove` · `/cart/remove-all` | Cart operations |
| POST | `/cart/checkout` | Place an order |
| POST | `/product/create` · `/product/update` · `/product/delete` | Admin product CRUD |
| GET | `/api/cart` | Current cart as JSON |
| GET | `/api/search?q=` | Search products |
| GET | `/api/product/:id` | Single product as JSON |

---

## 🔄 How Real-Time Updates Work

When an admin creates, edits or deletes a product — or a customer completes a checkout — the server broadcasts a `REFRESH_DATA` message over WebSocket. All connected clients receive it and refresh their data automatically, keeping the storefront and admin panels in sync.

---

## 🛣️ Roadmap

This project is built as a learning-focused, demo-ready application. Planned improvements:

- [ ] Hash passwords with **bcrypt**
- [ ] Move secrets to environment variables (`.env`)
- [ ] Migrate from JSON files to a database (MongoDB / SQL Server)
- [ ] Online payment gateway integration (bKash / SSLCommerz)
- [ ] Order status tracking and customer order history
- [ ] Input validation, CSRF protection and rate limiting
- [ ] Pagination and category filters

---

## 🤝 Contributing

Contributions, issues and feature requests are welcome!

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m "Add amazing feature"`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **ISC License**.

---

## 👨‍💻 Author

**Tawhidur Rahman**

[![GitHub](https://img.shields.io/badge/GitHub-<your--username>-181717?style=flat-square&logo=github)](https://github.com/<your-username>)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=flat-square&logo=linkedin)](https://linkedin.com/in/<your-profile>)

<div align="center">

⭐ If you found this project useful, please consider giving it a star!

</div>
