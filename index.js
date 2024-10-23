var express = require('express'); // นำเข้า express เพื่อสร้างเว็บเซิร์ฟเวอร์
var ejs = require('ejs'); // นำเข้า EJS สำหรับการเรนเดอร์หน้าเว็บ
var mysql = require('mysql'); // นำเข้า MySQL เพื่อเชื่อมต่อฐานข้อมูล
var bodyParser = require('body-parser'); // ใช้สำหรับแปลงข้อมูลที่ส่งจากฟอร์ม
var session = require('express-session'); // ใช้สำหรับจัดการเซสชันผู้ใช้

const app = express(); // สร้างแอป Express

app.listen(8080); // ตั้งค่าให้เซิร์ฟเวอร์ฟังที่พอร์ต 8080
app.use(bodyParser.urlencoded({ extended: true })); // ใช้ bodyParser เพื่อแปลงข้อมูลฟอร์ม
app.use(express.static('public')); // กำหนดให้ใช้ไฟล์ในโฟลเดอร์ public เป็นไฟล์ static
app.set('view engine', 'ejs'); // ตั้งค่า EJS เป็น template engine
app.use(session({secret: "secret",resave:false,saveUninitialized:false,})); // ตั้งค่าเซสชัน

// เชื่อมต่อกับ MySQL
mysql.createConnection({
    host: 'localhost', // ที่อยู่ของฐานข้อมูล
    user: 'root', // ชื่อผู้ใช้ฐานข้อมูล
    password: '', // รหัสผ่านฐานข้อมูล
    database: 'node_project' // ชื่อฐานข้อมูลที่ใช้
});

// ฟังก์ชันตรวจสอบว่าสินค้าอยู่ในตะกร้าหรือเปล่า
function isProductInCart(cart,id){
    for(let i = 0; i < cart.length; i++){ // ลูปผ่านสินค้าทั้งหมดในตะกร้า
        if(cart[i].id == id){ // ถ้าสินค้ามีในตะกร้า
            return true; // คืนค่า true ถ้ามี
        }
    }
    return false; // คืนค่า false ถ้าไม่พบ
};

// ฟังก์ชันคำนวณยอดรวมในตะกร้า
function calculateTotal(cart, req) {
    let total = 0;  // เริ่มต้นยอดรวมที่ 0
    for (let i = 0; i < cart.length; i++) {  // ลูปผ่านสินค้าทั้งหมดในตะกร้า
        if (cart[i].sale_price) { // ถ้ามีราคาลด
            total += cart[i].sale_price * cart[i].quantity; // คำนวณยอดรวม
        } else {
            total += cart[i].price * cart[i].quantity; // ถ้าไม่มีราคาลด ก็คำนวณจากราคาปกติ
        }
    }
    req.session.total = total;  // เก็บยอดรวมในเซสชัน
    return total; // คืนค่ายอดรวม
}

// หน้าแรกแสดงสินค้าทั้งหมด
app.get('/', function(req, res){
    var con = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'node_project'
    });

    con.query("SELECT * FROM products",(err,result)=>{ // ดึงข้อมูลสินค้าจากฐานข้อมูล
        res.render('pages/index',{result: result}); // แสดงผลสินค้าบนหน้าเว็บ
    });
});

// เพิ่มสินค้าลงในตะกร้า
app.post('/add_to_cart',function(req, res){
    var id = req.body.id; // ดึง id ของสินค้า
    var name = req.body.name; // ดึงชื่อสินค้า
    var price = req.body.price; // ดึงราคาสินค้า
    var sale_price = req.body.sale_price; // ดึงราคาลด
    var quantity = req.body.quantity; // ดึงจำนวนสินค้า
    var image = req.body.image; // ดึงลิงก์รูปสินค้า
    var product = {id:id,name:name,price:price,sale_price:sale_price,quantity:quantity,image:image} // สร้างออบเจ็กต์สินค้า

    if(req.session.cart){ // ถ้ามีตะกร้าในเซสชัน
        var cart = req.session.cart;
        if(!isProductInCart(cart,id)){ // ตรวจสอบว่าสินค้าอยู่ในตะกร้าหรือยัง
            cart.push(product); // ถ้าไม่อยู่ให้เพิ่มสินค้า
        }
    }else{
        req.session.cart = [product]; // ถ้ายังไม่มี ให้สร้างตะกร้าใหม่
        var cart = req.session.cart; // กำหนดให้ cart เป็นตะกร้าในเซสชัน
    }

    calculateTotal(cart,req); // คำนวณยอดรวม

    res.redirect('/cart'); // เปลี่ยนเส้นทางไปที่หน้า cart
});

// หน้าแสดงตะกร้าสินค้า
app.get('/cart',function(req,res){
    var cart = req.session.cart; // ดึงตะกร้าจากเซสชัน
    var total = req.session.total; // ดึงยอดรวมจากเซสชัน
    res.render('pages/cart',{cart:cart,total:total}); // แสดงผลตะกร้าและยอดรวม
});

// ลบสินค้าจากตะกร้า
app.post('/remove_product',function(req,res){
    var id = req.body.id; // ดึง id ของสินค้าที่ต้องการลบ
    var cart = req.session.cart; // ดึงตะกร้าจากเซสชัน

    for(let i=0;  i<cart.length; i++){ // ลูปผ่านสินค้าทั้งหมดในตะกร้า
        if(cart[i].id == id){ // ถ้าพบสินค้าในตะกร้า
            cart.splice(cart.indexOf(i),1); // ลบสินค้านั้นออกจากตะกร้า
        }
    }

    calculateTotal(cart,req); // คำนวณยอดรวมอีกครั้ง
    res.redirect('/cart'); // เปลี่ยนเส้นทางไปที่หน้า cart
});

// แก้ไขจำนวนสินค้าที่อยู่ในตะกร้า
app.post('/edit_product_quantity',function(req,res){
    var id = req.body.id; // ดึง id ของสินค้า
    var quantity = req.body.quantity; // ดึงจำนวนที่ส่งมา
    var increase_btn = req.body.increase_product_quantity; // เช็คว่ามีการกดเพิ่มจำนวนไหม
    var decrease_btn = req.body.decrease_product_quantity; // เช็คว่ามีการกดลดจำนวนไหม

    var cart = req.session.cart; // ดึงตะกร้าจากเซสชัน

    if(increase_btn){ // ถ้ากดเพิ่มจำนวน
        for(let i=0; i<cart.length;i++){ // ลูปผ่านสินค้าทั้งหมดในตะกร้า
            if(cart[i].id == id){ // ถ้าพบสินค้า
                if(cart[i].quantity >0){ // ถ้าจำนวนมากกว่า 0
                    cart[i].quantity = parseInt(cart[i].quantity)+1; // เพิ่มจำนวน
                }
            }
        }
    }
    if(decrease_btn){ // ถ้ากดลดจำนวน
        for(let i=0; i<cart.length;i++){ // ลูปผ่านสินค้าทั้งหมดในตะกร้า
            if(cart[i].id == id){ // ถ้าพบสินค้า
                if(cart[i].quantity >1){ // ถ้าจำนวนน้อยกว่า 1
                    cart[i].quantity = parseInt(cart[i].quantity)-1; // ลดจำนวน
                }
            }
        }
    }

    calculateTotal(cart,req); // คำนวณยอดรวมอีกครั้ง
    res.redirect('/cart') // เปลี่ยนเส้นทางไปที่หน้า cart
});

// หน้าเช็คเอาท์
app.get('/checkout',function(req,res){
    var total = req.session.total; // ดึงยอดรวมจากเซสชัน
    res.render('pages/checkout',{total:total}); // แสดงยอดรวมในหน้าเช็คเอาท์
});

// สั่งซื้อสินค้า
app.post('/place_order',function(req,res){
    var name = req.body.name; // ดึงชื่อผู้สั่ง
    var email = req.body.email; // ดึงอีเมล
    var phone = req.body.phone; // ดึงเบอร์โทร
    var city = req.body.city; // ดึงเมือง
    var address = req.body.address; // ดึงที่อยู่
    var cost = req.session.total; // ดึงยอดรวม
    var status = "not paid"; // ตั้งค่าสถานะเริ่มต้นว่าไม่ชำระเงิน
    var date = new Date(); // วันที่สั่งซื้อ
    var product_ids = ""; // สร้างตัวแปรสำหรับเก็บ id สินค้า

    var con = mysql.createConnection({
        host: 'localhost', // ที่อยู่ของฐานข้อมูล
        user: 'root', // ชื่อผู้ใช้ฐานข้อมูล
        password: '', // รหัสผ่านฐานข้อมูล
        database: 'node_project' // ชื่อฐานข้อมูล
    });

    var cart = req.session.cart; // ดึงตะกร้าจากเซสชัน
    for(let i=0; i<cart.length; i++){ // ลูปผ่านสินค้าทั้งหมดในตะกร้า
        product_ids = product_ids +","+cart[i].id; // สร้างสตริงของ id สินค้า
    }

    con.connect((err)=>{ // เชื่อมต่อกับฐานข้อมูล
        if(err){
            console.log(err) // ถ้ามีข้อผิดพลาดแสดงผล
        }else{
            var query = "INSERT INTO orders(cost,name,email,status,city,address,phone,date,product_ids) VALUES ?"; // สร้างคำสั่ง SQL สำหรับสั่งซื้อ
            var values = [
            [cost,name,email,status,city,address,phone,date,product_ids] // ข้อมูลที่ต้องการบันทึก
            ];
            con.query(query,[values],(err,result)=>{ // ส่งคำสั่ง SQL ไปยังฐานข้อมูล
                res.redirect('/payment') // เปลี่ยนเส้นทางไปที่หน้าชำระเงิน
            })
        }
    })
});

// หน้าแสดงการชำระเงิน
app.get('/payment', function (req, res) {
    var total = req.session.total; // ดึงยอดรวมจากเซสชัน
    res.render('pages/payment', { total: total }); // ส่งยอดรวมไปยังหน้าแสดงการชำระเงิน
});

// Route สำหรับการชำระเงินและอัปเดตสถานะการสั่งซื้อ
app.post('/pay_now', function(req, res) {
    var con = mysql.createConnection({
        host: 'localhost', // ที่อยู่ของฐานข้อมูล
        user: 'root', // ชื่อผู้ใช้ฐานข้อมูล
        password: '', // รหัสผ่านฐานข้อมูล
        database: 'node_project' // ชื่อฐานข้อมูล
    });

    var status = "paid"; // ตั้งค่าสถานะเป็นชำระแล้ว
    var date = new Date(); // วันที่ชำระเงิน
    
    // คำสั่ง SQL อัปเดตสถานะการสั่งซื้อล่าสุด
    var query = "UPDATE orders SET status = ?, date = ? ORDER BY id DESC LIMIT 1";

    con.connect(function(err) { // เชื่อมต่อกับฐานข้อมูล
        if (err) {
            console.log(err); // ถ้ามีข้อผิดพลาดแสดงผล
        } else {
            con.query(query, [status, date], function(err, result) { // ส่งคำสั่ง SQL เพื่ออัปเดตสถานะ
                if (err) {
                    console.log(err); // ถ้ามีข้อผิดพลาดแสดงผล
                } else {
                    res.redirect('/payment_success'); // เปลี่ยนเส้นทางไปที่หน้าชำระเงินสำเร็จ
                }
            });
        }
    });
});

// หน้าแสดงการชำระเงินสำเร็จ
app.get('/payment_success', function(req, res) {
    res.render('pages/payment_success'); // แสดงผลหน้าชำระเงินสำเร็จ
});
