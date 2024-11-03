// นำเข้าโมดูลต่างๆ ที่จำเป็นสำหรับการสร้างเว็บแอปพลิเคชัน
var express = require('express'); // ใช้ Express สำหรับสร้างเซิร์ฟเวอร์เว็บ
var ejs = require('ejs'); // ใช้ EJS สำหรับการเรนเดอร์หน้าเว็บ
var mysql = require('mysql'); // ใช้ MySQL เพื่อเชื่อมต่อฐานข้อมูล
var bodyParser = require('body-parser'); // ใช้ bodyParser สำหรับแปลงข้อมูลที่ส่งจากฟอร์ม
var session = require('express-session'); // ใช้ express-session สำหรับจัดการเซสชันผู้ใช้

const app = express(); // สร้างแอป Express

// ตั้งค่าและใช้งาน middleware ต่างๆ
app.listen(8080); // กำหนดพอร์ตที่แอปจะฟัง (พอร์ต 8080)
app.use(bodyParser.urlencoded({ extended: true })); // ใช้ bodyParser สำหรับแปลงข้อมูลฟอร์ม
app.use(express.static('public')); // กำหนดให้ใช้ไฟล์ในโฟลเดอร์ public เป็นไฟล์ static
app.set('view engine', 'ejs'); // ตั้งค่า EJS เป็น template engine
app.use(session({ secret: "secret", resave: false, saveUninitialized: false })); // ตั้งค่า session สำหรับเก็บข้อมูลผู้ใช้

// เชื่อมต่อกับฐานข้อมูล MySQL
mysql.createConnection({
    host: 'localhost', // ที่อยู่ของฐานข้อมูล
    user: 'root', // ชื่อผู้ใช้ฐานข้อมูล
    password: '', // รหัสผ่านฐานข้อมูล
    database: 'node_project' // ชื่อฐานข้อมูล
});

// ฟังก์ชันตรวจสอบว่าสินค้าอยู่ในตะกร้าหรือไม่
function isProductInCart(cart, id) {
    for (let i = 0; i < cart.length; i++) {
        if (cart[i].id == id) { // ตรวจสอบว่า id ของสินค้าตรงกับ id ในตะกร้า
            return true;
        }
    }
    return false; // ถ้าไม่พบสินค้าในตะกร้า คืนค่า false
};

// ฟังก์ชันคำนวณยอดรวมในตะกร้า
function calculateTotal(cart, req) {
    let total = 0; // กำหนดยอดรวมเริ่มต้นที่ 0
    for (let i = 0; i < cart.length; i++) {
        // ตรวจสอบว่ามีราคาลดหรือไม่ และคำนวณยอดรวมตามจำนวนสินค้า
        if (cart[i].sale_price) {
            total += cart[i].sale_price * cart[i].quantity;
        } else {
            total += cart[i].price * cart[i].quantity;
        }
    }
    req.session.total = total; // บันทึกยอดรวมใน session
    return total; // คืนค่ายอดรวมทั้งหมด
}

// Route หน้าแรกของแอป แสดงสินค้าทั้งหมดจากฐานข้อมูล
app.get('/', function(req, res) {
    var con = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'node_project'
    });

    // ดึงข้อมูลสินค้าทั้งหมดจากฐานข้อมูลและแสดงผลในหน้า index
    con.query("SELECT * FROM products", (err, result) => {
        res.render('pages/index', { result: result });
    });
});

// Route สำหรับเพิ่มสินค้าไปยังตะกร้า
app.post('/add_to_cart', function(req, res) {
    // ดึงข้อมูลสินค้าจากฟอร์ม
    var id = req.body.id;
    var name = req.body.name;
    var price = req.body.price;
    var sale_price = req.body.sale_price;
    var quantity = req.body.quantity;
    var image = req.body.image;

    // สร้างออบเจ็กต์สินค้าที่จะเพิ่มเข้าไปในตะกร้า
    var product = { id: id, name: name, price: price, sale_price: sale_price, quantity: quantity, image: image };

    if (req.session.cart) { // ตรวจสอบว่ามีตะกร้าใน session หรือไม่
        var cart = req.session.cart;
        if (!isProductInCart(cart, id)) { // ถ้าสินค้ายังไม่มีในตะกร้า
            cart.push(product); // เพิ่มสินค้าเข้าไปในตะกร้า
        }
    } else {
        req.session.cart = [product]; // ถ้ายังไม่มีตะกร้า ให้สร้างตะกร้าใหม่ใน session
        var cart = req.session.cart;
    }

    calculateTotal(cart, req); // คำนวณยอดรวมของตะกร้า

    res.redirect('/cart'); // เปลี่ยนหน้าไปยังหน้าแสดงตะกร้าสินค้า
});

// Route แสดงหน้า cart ที่มีสินค้าในตะกร้า
app.get('/cart', function(req, res) {
    var cart = req.session.cart; // ดึงข้อมูลตะกร้าจาก session
    var total = req.session.total; // ดึงยอดรวมจาก session
    res.render('pages/cart', { cart: cart, total: total }); // แสดงข้อมูลในหน้า cart
});

// Route ลบสินค้าออกจากตะกร้า
app.post('/remove_product', function(req, res) {
    var id = req.body.id;
    var cart = req.session.cart;

    for (let i = 0; i < cart.length; i++) {
        if (cart[i].id == id) { // ถ้าพบสินค้าตรงกับ id ที่ส่งมา
            cart.splice(i, 1); // ลบสินค้าออกจากตะกร้า
            break;
        }
    }

    calculateTotal(cart, req); // คำนวณยอดรวมอีกครั้งหลังจากลบสินค้า
    res.redirect('/cart'); // กลับไปหน้า cart
});

// Route แก้ไขจำนวนสินค้าที่อยู่ในตะกร้า
app.post('/edit_product_quantity', function(req, res) {
    var id = req.body.id;
    var quantity = req.body.quantity;
    var increase_btn = req.body.increase_product_quantity;
    var decrease_btn = req.body.decrease_product_quantity;

    var cart = req.session.cart;

    if (increase_btn) { // ถ้ากดเพิ่มจำนวนสินค้า
        for (let i = 0; i < cart.length; i++) {
            if (cart[i].id == id) {
                cart[i].quantity = parseInt(cart[i].quantity) + 1;
                break;
            }
        }
    }
    if (decrease_btn) { // ถ้ากดลดจำนวนสินค้า
        for (let i = 0; i < cart.length; i++) {
            if (cart[i].id == id) {
                cart[i].quantity = parseInt(cart[i].quantity) - 1;
                break;
            }
        }
    }

    calculateTotal(cart, req); // คำนวณยอดรวมใหม่
    res.redirect('/cart'); // กลับไปที่หน้า cart
});

// Route แสดงหน้า checkout
app.get('/checkout', function(req, res) {
    var total = req.session.total;
    res.render('pages/checkout', { total: total }); // แสดงยอดรวมในหน้า checkout
});

// Route วางคำสั่งซื้อและบันทึกข้อมูลการสั่งซื้อในฐานข้อมูล
app.post('/place_order', function(req, res) {
    // ดึงข้อมูลผู้สั่งซื้อจากฟอร์ม
    var name = req.body.name;
    var email = req.body.email;
    var phone = req.body.phone;
    var city = req.body.city;
    var address = req.body.address;
    var cost = req.session.total;
    var status = "not paid";
    var date = new Date();
    var product_ids = "";

    var con = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'node_project'
    });

    var cart = req.session.cart;
    for (let i = 0; i < cart.length; i++) {
        product_ids += "," + cart[i].id;
    }

    con.connect((err) => {
        if (err) {
            console.log(err);
        } else {
            var query = "INSERT INTO orders(cost, name, email, status, city, address, phone, date, product_ids) VALUES ?";
            var values = [
                [cost, name, email, status, city, address, phone, date, product_ids]
            ];
            con.query(query, [values], (err, result) => {
                res.redirect('/payment');
            });
        }
    });
});

// Route แสดงหน้าชำระเงิน
app.get('/payment', function(req, res) {
    var total = req.session.total;
    res.render('pages/payment', { total: total });
});

// Route จัดการการชำระเงินและอัปเดตสถานะการสั่งซื้อ
app.post('/pay_now', function(req, res) {
    var con = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'node_project'
    });

    var status = "paid";
    var date = new Date();

    var query = "UPDATE orders SET status = ?, date = ? ORDER BY id DESC LIMIT 1";

    con.connect(function(err) {
        if (err) {
            console.log(err);
        } else {
            con.query(query, [status, date], function(err, result) {
                if (err) {
                    console.log(err);
                }
                res.redirect('/thank_you');
            });
        }
    });
});

// Route ขอบคุณผู้ใช้หลังจากทำรายการสำเร็จ
app.get('/thank_you', function(req, res) {
    var total = req.session.total;
    res.render('pages/payment_success', { total: total });
});
