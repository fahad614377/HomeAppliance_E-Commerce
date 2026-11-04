
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const http = require("http");              
const { WebSocketServer } = require("ws");  
const session = require("express-session");
const PDFDocument = require("pdfkit");     

const app = express();
const PORT = 3030; 
const server = http.createServer(app);
const wss = new WebSocketServer({ server });



app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.json());                                        
app.use(express.urlencoded({ extended: true }));               
app.use(express.static("public"));                               
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


app.use(
  session({
    secret: "home_appliance_store_secret_key_2026",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,       
      maxAge: 1000 * 60 * 60 * 8, 
    },
  })
);


app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});


if (!fs.existsSync("./uploads")) fs.mkdirSync("./uploads");
if (!fs.existsSync("./data")) fs.mkdirSync("./data");


//Pic_Up..
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage: storage });


const productsPath = path.join(__dirname, "data", "products.json");
const salesPath = path.join(__dirname, "data", "sales.json");
const usersPath = path.join(__dirname, "data", "users.json");


const readJSONFile = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content || "[]");
  } catch (e) {
    return [];
  }
};


//Login_Check..

const requireAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect("/login");
};

//User_Status..

const requireAdmin = (req, res, next) => {
  if (req.session && req.session.user) {
    const role = req.session.user.role;
    const username = req.session.user.username.toLowerCase();
    if (role === "admin" || username === "admin") {
      return next();
    }
  }
  res.status(403).send("Access Denied: You need admin permissions to view this page.");
};




//pageUpdating..

const broadcastRefresh = () => {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { 
      client.send(JSON.stringify({ type: "REFRESH_DATA" }));
    }
  });
};


app.get("/register", (req, res) => {
  res.render("register", { error: null, success: null });
});



app.post("/register", (req, res) => {
  const { username, password, fullName, phone, address } = req.body;


  if (!username || !password || !fullName || !phone || !address) {
    return res.render("register", {
      error: "All fields are required. Please fill in every field.",
      success: null,
    });
  }

  const users = readJSONFile(usersPath);


  const userExists = users.some(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );
  if (userExists) {
    return res.render("register", {
      error: "This username is already taken. Please choose another.",
      success: null,
    });
  }




  const assignedRole =
    username.trim().toLowerCase() === "admin" ? "admin" : "customer";

 
  const newUser = {
    id: "USR-" + Date.now(),
    username: username.trim(),
    password: password,         
    fullName: fullName.trim(),
    phone: phone.trim(),
    address: address.trim(),
    role: assignedRole,
    createdAt: new Date().toISOString(),
  };



 //user Save..

  users.push(newUser);
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));

  return res.render("register", {
    error: null,
    success: "Account created successfully! You can now log in.",
  });
});



app.get("/login", (req, res) => {
  const redirectTo = req.query.redirect || "";
  res.render("login", { error: null, redirectTo: redirectTo });
});




app.post("/login", (req, res) => {
  const { username, password, redirectTo } = req.body;
  const users = readJSONFile(usersPath);



//userPass_Check..
  const matchingUser = users.find(
    (u) =>
      u.username.toLowerCase() === username.toLowerCase() &&
      u.password === password
  );

  if (matchingUser) {
   
    let assignedRole = "customer";
    if (matchingUser.role) {
      assignedRole = matchingUser.role;
    } else if (matchingUser.username.toLowerCase() === "admin") {
      assignedRole = "admin";
    }

  

    req.session.user = {
      id: matchingUser.id,
      username: matchingUser.username,
      fullName: matchingUser.fullName || matchingUser.username,
      phone: matchingUser.phone || "",
      address: matchingUser.address || "",
      role: assignedRole,
      loginTime: new Date(),
    };

  
    if (!req.session.cart) {
      req.session.cart = [];
    }

  
    if (redirectTo && redirectTo.length > 0) {
      return res.redirect(redirectTo);
    }

 
  //After login Homepage
    return res.redirect("/");
  } else {
    return res.render("login", {
      error: "Invalid username or password. Please try again.",
      redirectTo: req.body.redirectTo || "",
    });
  }
});




app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error("Error destroying session:", err);
    res.redirect("/");
  });
});



//ProductAndCart

app.get("/", (req, res) => {
  const products = readJSONFile(productsPath);
  const userCart = (req.session && req.session.cart) ? req.session.cart : [];
  const cartTotal = userCart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  res.render("home", {
    products: products,
    cart: userCart,
    cartTotal: cartTotal.toFixed(2),
  });
});


//CartItem...

app.get("/cart", requireAuth, (req, res) => {
  const products = readJSONFile(productsPath);
  const userCart = req.session.cart || [];
  const cartTotal = userCart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  res.render("dashboard", {
    products: products,
    cart: userCart,
    cartTotal: cartTotal.toFixed(2),
  });
});




app.get("/admin/inventory", requireAdmin, (req, res) => {
  const products = readJSONFile(productsPath);
  res.render("admin-inventory", { products: products });
});



//Prod_Add

app.post("/cart/add", (req, res) => {
  const isAjax = req.headers.accept && req.headers.accept.includes("application/json");

 
  if (!req.session || !req.session.user) {
    if (isAjax) {
      return res.status(401).json({ success: false, message: "Please sign in first." });
    }
    return res.redirect("/login?redirect=/");
  }

  const { productId } = req.body;
  const products = readJSONFile(productsPath);
  const targetProduct = products.find((p) => p.id === productId);

  if (!req.session.cart) {
    req.session.cart = [];
  }

  if (targetProduct) {
    const existingCartItem = req.session.cart.find((item) => item.id === productId);
    if (existingCartItem) {
      existingCartItem.quantity += 1;
    } else {
      req.session.cart.push({ ...targetProduct, quantity: 1 });
    }
  }

  

  if (isAjax) {
    const cartTotal = req.session.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return res.json({ success: true, cart: req.session.cart, cartTotal: cartTotal.toFixed(2) });
  }

  const referer = req.headers.referer || "/";
  if (referer.includes("/cart")) {
    return res.redirect("/cart");
  }
  return res.redirect("/");
});




app.post("/cart/remove", requireAuth, (req, res) => {
  const { productId } = req.body;
  if (!req.session.cart) req.session.cart = [];

  const itemIndex = req.session.cart.findIndex((item) => item.id === productId);

  if (itemIndex !== -1) {
    if (req.session.cart[itemIndex].quantity > 1) {
      req.session.cart[itemIndex].quantity -= 1;
    } else {
      req.session.cart.splice(itemIndex, 1);
    }
  }

 

  const isAjax = req.headers.accept && req.headers.accept.includes("application/json");
  if (isAjax) {
    const cartTotal = req.session.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return res.json({ success: true, cart: req.session.cart, cartTotal: cartTotal.toFixed(2) });
  }

  const referer = req.headers.referer || "/";
  if (referer.includes("/cart")) return res.redirect("/cart");
  return res.redirect("/");
});





app.post("/cart/remove-all", requireAuth, (req, res) => {
  const { productId } = req.body;
  if (!req.session.cart) req.session.cart = [];

  req.session.cart = req.session.cart.filter((item) => item.id !== productId);


  const isAjax = req.headers.accept && req.headers.accept.includes("application/json");
  if (isAjax) {
    const cartTotal = req.session.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return res.json({ success: true, cart: req.session.cart, cartTotal: cartTotal.toFixed(2) });
  }

  const referer = req.headers.referer || "/";
  if (referer.includes("/cart")) return res.redirect("/cart");
  return res.redirect("/");
});



//cart_Checkout

app.post("/cart/checkout", requireAuth, (req, res) => {
  const userCart = req.session.cart || [];

  if (userCart.length === 0) {
    return res.redirect("/");
  }

 

  const customerName = req.body.customerName || req.session.user.fullName || "Valued Customer";
  const customerPhone = req.body.customerPhone || req.session.user.phone || "N/A";
  const customerAddress = req.body.customerAddress || req.session.user.address || "N/A";
  const paymentMethod = req.body.paymentMethod || "Cash on Delivery";

  const salesLog = readJSONFile(salesPath);

  const grandTotal = userCart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );



//Uniq_OrderId..

  const orderId = "ORD-" + Date.now();
  userCart.forEach((item) => {
    const newSale = {
      saleId: "SALE-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      orderId: orderId,
      customerName: customerName,
      customerPhone: customerPhone,
      customerAddress: customerAddress,
      paymentMethod: paymentMethod,
      productName: item.name,
      price: parseFloat(item.price),
      quantity: parseInt(item.quantity),
      totalAmount: parseFloat((item.price * item.quantity).toFixed(2)),
      imagePath: item.imagePath,
      saleDate: new Date().toISOString(),
    };
    salesLog.push(newSale);
  });

  
  fs.writeFileSync(salesPath, JSON.stringify(salesLog, null, 2));


  req.session.lastOrder = {
    orderId: orderId,
    customerName: customerName,
    customerPhone: customerPhone,
    customerAddress: customerAddress,
    paymentMethod: paymentMethod,
    items: userCart.map(function(item) {
      return {
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        total: parseFloat((item.price * item.quantity).toFixed(2)),
        imagePath: item.imagePath,
      };
    }),
    grandTotal: parseFloat(grandTotal.toFixed(2)),
    orderDate: new Date().toISOString(),
  };

 
  req.session.cart = [];

  req.session.save(function(err) {
    if (err) console.error("Session save error:", err);
    setTimeout(function() { broadcastRefresh(); }, 500);

    const acceptHeader = req.headers.accept || "";
    if (acceptHeader.includes("json")) {
      return res.status(200).json({ success: true, message: "Order placed successfully!" });
    }
    res.redirect("/checkout-success");
  });
});



//Admin_ProductAdd

app.post("/product/create", requireAdmin, upload.single("newProductImage"), (req, res) => {
  const { newProductName, newProductPrice, newProductCategory, newProductDescription } = req.body;
  const products = readJSONFile(productsPath);

  if (!req.file) {
    return res.status(400).send("Please upload a product image.");
  }

  const newEntry = {
    id: "Product-" + Date.now(),
    name: newProductName,
    price: parseFloat(newProductPrice),
    imagePath: `/uploads/${req.file.filename}`,
    category: newProductCategory || "General",
    description: newProductDescription || "",
  };

  products.push(newEntry);
  fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));

  broadcastRefresh();
  res.redirect("/admin/inventory");
});




//Prod_Update..

app.post("/product/update", requireAdmin, upload.single("updateProductImage"), (req, res) => {
  const { productId, updateProductName, updateProductPrice, updateProductCategory, updateProductDescription } = req.body;
  let products = readJSONFile(productsPath);

  const targetIndex = products.findIndex((p) => p.id === productId);
  if (targetIndex !== -1) {
    products[targetIndex].name = updateProductName;
    products[targetIndex].price = parseFloat(updateProductPrice);
    products[targetIndex].category = updateProductCategory || products[targetIndex].category;
    products[targetIndex].description = updateProductDescription || products[targetIndex].description || "";

  
    if (req.file) {
      products[targetIndex].imagePath = `/uploads/${req.file.filename}`;
    }

    fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));

   
    if (req.session && req.session.cart) {
      req.session.cart = req.session.cart.map((item) => {
        if (item.id === productId) {
          return {
            ...item,
            name: updateProductName,
            price: parseFloat(updateProductPrice),
            imagePath: req.file ? `/uploads/${req.file.filename}` : item.imagePath,
          };
        }
        return item;
      });
    }
    broadcastRefresh();
  }
  res.redirect("/admin/inventory");
});




//Product_Delete..

app.post("/product/delete", requireAdmin, (req, res) => {
  const { productId } = req.body;
  let products = readJSONFile(productsPath);

  products = products.filter((p) => p.id !== productId);
  fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));

  if (req.session && req.session.cart) {
    req.session.cart = req.session.cart.filter((item) => item.id !== productId);
  }

  broadcastRefresh();
  res.redirect("/admin/inventory");
});



//sales_detail

app.get("/sales", requireAdmin, (req, res) => {
  const sales = readJSONFile(salesPath);
  res.render("sales-log", { sales: sales.reverse() }); 
});


app.get("/checkout-success", requireAuth, (req, res) => {
  const lastOrder = req.session.lastOrder || null;
  res.render("checkout-success", { lastOrder: lastOrder });
});



//Pdf_create

app.get("/invoice/download", requireAuth, (req, res) => {
  const order = req.session.lastOrder;

  if (!order) {
    return res.redirect("/");
  }


  const doc = new PDFDocument({ size: "A4", margin: 50 });


  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=HomeNest-Invoice-" + order.orderId + ".pdf");

  doc.pipe(res);

  


  doc.fontSize(24).font("Helvetica-Bold").fillColor("#1a365d")
     .text("HomeNest", 50, 50);
  doc.fontSize(10).font("Helvetica").fillColor("#718096")
     .text("Home Appliance Store", 50, 78);
  doc.text("Dhaka, Bangladesh", 50, 92);
  doc.text("Phone: +880-1700-000000", 50, 106);

  
  doc.fontSize(20).font("Helvetica-Bold").fillColor("#2b6cb0")
     .text("INVOICE", 400, 50, { width: 150, align: "right" });

  
  doc.fontSize(9).font("Helvetica").fillColor("#4a5568")
     .text("Order ID: " + order.orderId, 350, 78, { width: 200, align: "right" });

  const orderDate = new Date(order.orderDate);
  const dateString = orderDate.toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric"
  });
  doc.text("Date: " + dateString, 350, 92, { width: 200, align: "right" });
  doc.text("Payment: " + order.paymentMethod, 350, 106, { width: 200, align: "right" });


  doc.moveTo(50, 130).lineTo(545, 130).strokeColor("#e2e8f0").lineWidth(1).stroke();





  doc.fontSize(11).font("Helvetica-Bold").fillColor("#1a202c")
     .text("Bill To:", 50, 145);
  doc.fontSize(10).font("Helvetica").fillColor("#2d3748")
     .text(order.customerName, 50, 162);
  doc.fillColor("#718096")
     .text("Phone: " + order.customerPhone, 50, 176);
  doc.text("Address: " + order.customerAddress, 50, 190, { width: 300 });


  const tableTop = 230;


  doc.rect(50, tableTop, 495, 22).fill("#edf2f7");

 
  doc.fontSize(9).font("Helvetica-Bold").fillColor("#4a5568");
  doc.text("#", 58, tableTop + 6, { width: 25 });
  doc.text("Product Name", 85, tableTop + 6, { width: 220 });
  doc.text("Unit Price", 310, tableTop + 6, { width: 75, align: "right" });
  doc.text("Qty", 390, tableTop + 6, { width: 35, align: "center" });
  doc.text("Total (BDT)", 430, tableTop + 6, { width: 110, align: "right" });

 

  let currentY = tableTop + 28;
  doc.font("Helvetica").fontSize(9).fillColor("#2d3748");

  order.items.forEach(function(item, index) {
   

    if (index % 2 === 0) {
      doc.rect(50, currentY - 4, 495, 20).fill("#f7fafc");
      doc.fillColor("#2d3748");
    }

    doc.text((index + 1).toString(), 58, currentY, { width: 25 });
    doc.text(item.name, 85, currentY, { width: 220 });
    doc.text(item.price.toFixed(2), 310, currentY, { width: 75, align: "right" });
    doc.text(item.quantity.toString(), 390, currentY, { width: 35, align: "center" });
    doc.text(item.total.toFixed(2), 430, currentY, { width: 110, align: "right" });

    currentY += 22;
  });

 //LineCont..


  currentY += 8;
  doc.moveTo(50, currentY).lineTo(545, currentY).strokeColor("#e2e8f0").lineWidth(1).stroke();
  currentY += 12;


  //Total..

  doc.fontSize(12).font("Helvetica-Bold").fillColor("#1a202c")
     .text("Grand Total:", 350, currentY, { width: 85, align: "right" });
  doc.fontSize(13).fillColor("#2b6cb0")
     .text("BDT. " + order.grandTotal.toFixed(2), 440, currentY, { width: 100, align: "right" });


  currentY += 50;
  doc.moveTo(50, currentY).lineTo(545, currentY).strokeColor("#e2e8f0").lineWidth(0.5).stroke();
  currentY += 15;

  doc.fontSize(9).font("Helvetica").fillColor("#a0aec0")
     .text("Thank you for shopping at HomeNest!", 50, currentY, { width: 495, align: "center" });
  doc.text("This is a computer-generated invoice. No signature is required.", 50, currentY + 14, { width: 495, align: "center" });
  doc.text("For any queries, contact us at support@homenest.com", 50, currentY + 28, { width: 495, align: "center" });

  doc.end();
});




app.get("/api/cart", (req, res) => {
  const userCart = (req.session && req.session.cart) ? req.session.cart : [];
  const cartTotal = userCart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  res.json({ cart: userCart, cartTotal: cartTotal.toFixed(2) });
});

//Search..

app.get("/api/search", (req, res) => {
  const query = (req.query.q || "").toLowerCase().trim();
  const products = readJSONFile(productsPath);

  if (!query) {
    return res.json({ results: products });
  }

  const filtered = products.filter(function(p) {
    return p.name.toLowerCase().includes(query) ||
           (p.category && p.category.toLowerCase().includes(query)) ||
           (p.description && p.description.toLowerCase().includes(query));
  });

  res.json({ results: filtered });
});


app.get("/api/product/:id", (req, res) => {
  const products = readJSONFile(productsPath);
  const product = products.find((p) => p.id === req.params.id);
  if (product) {
    res.json({ product: product });
  } else {
    res.status(404).json({ error: "Product not found" });
  }
});





wss.on("connection", (socket) => {
  console.log("A client connected via WebSocket.");

  socket.on("message", (rawData) => {
    try {
      const data = JSON.parse(rawData);
      // We only handle refresh signals now (chat removed)
      if (data.type === "REFRESH_DATA") {
        broadcastRefresh();
      }
    } catch (err) {
      console.error("Error processing WebSocket message:", err);
    }
  });
});


server.listen(PORT, () => {
  console.log("===========================================");
  console.log("  HomeNest Appliance Store is running!");
  console.log("  Open in browser: http://localhost:" + PORT);
  console.log("===========================================");
});
