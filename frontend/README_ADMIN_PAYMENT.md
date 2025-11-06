# LUXE3D - Admin Panel & Payment Integration

## Admin Panel

### Access Admin Panel
- **URL**: `/admin/login`
- **Demo Credentials**:
  - Username: `admin`
  - Password: `admin123`

### Admin Features

#### 1. Dashboard Overview
- View total products count
- Revenue statistics
- Order tracking
- Growth metrics

#### 2. Product Management
- **Add New Products**: Click "Add Product" button
  - Product Name (required)
  - Category (Women/Men/Accessories/etc.)
  - Price (required)
  - Original Price (optional - for showing discounts)
  - Image URL (required)
  - Primary Color (color picker)
  - Badge (New/Sale/Trending/Bestseller)
  - Description

- **Edit Products**: Click edit icon on any product
- **Delete Products**: Click delete icon (with confirmation)

#### 3. Data Storage
Currently using localStorage for demo purposes. Products are stored in:
- Key: `adminProducts`
- Format: JSON array of product objects

**For MongoDB Integration**:
Replace localStorage calls with API calls to your backend:
```javascript
// Example API structure
POST /api/products - Create product
GET /api/products - Get all products
PUT /api/products/:id - Update product
DELETE /api/products/:id - Delete product
```

---

## Razorpay Payment Integration

### Setup Instructions

#### 1. Get Razorpay Keys
1. Sign up at [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Navigate to Settings > API Keys
3. Generate Test/Live Keys
4. Copy your Key ID and Key Secret

#### 2. Configure Razorpay
Open `/app/frontend/src/pages/CartPage.jsx` and update:
```javascript
const options = {
  key: 'rzp_test_YOUR_KEY_ID', // Replace with your actual key
  // ... rest of config
};
```

#### 3. Test Payment Flow
**Test Mode Credentials**:
- Card Number: `4111 1111 1111 1111`
- CVV: Any 3 digits
- Expiry: Any future date

**Test UPI**: Use `success@razorpay`

#### 4. Payment Flow
1. Add products to cart
2. Navigate to cart page (`/cart`)
3. Review order summary
4. Click "Proceed to Payment"
5. Razorpay modal opens
6. Complete payment
7. Success callback clears cart and shows confirmation

### Razorpay Features Implemented
- ✅ Test/Live mode support
- ✅ Multiple payment methods (Cards, UPI, Wallets, NetBanking)
- ✅ Currency support (USD configured, easily changeable)
- ✅ Order amount calculation
- ✅ Success/Failure callbacks
- ✅ Payment cancellation handling
- ✅ Branding customization

### Backend Integration (For MongoDB)

When you create your MongoDB backend, implement these endpoints:

```javascript
// Order Management
POST /api/orders - Create new order
{
  items: [...cartItems],
  total: calculatedTotal,
  razorpay_payment_id: 'pay_xxxxx',
  razorpay_order_id: 'order_xxxxx',
  customer: {...customerData}
}

// Razorpay Verification
POST /api/payment/verify - Verify payment signature
{
  razorpay_payment_id,
  razorpay_order_id,
  razorpay_signature
}

// Order Retrieval
GET /api/orders/:userId - Get user orders
GET /api/admin/orders - Get all orders (admin)
```

### Environment Variables
Create `.env` file in frontend directory:
```
REACT_APP_RAZORPAY_KEY_ID=rzp_test_YOUR_KEY
```

Access in code:
```javascript
key: process.env.REACT_APP_RAZORPAY_KEY_ID
```

---

## Security Notes

### Important for Production:

1. **Never expose Razorpay Key Secret** on frontend
2. **Payment verification** must be done on backend:
   ```javascript
   // Backend verification using crypto
   const crypto = require('crypto');
   const hmac = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET);
   hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
   const generated_signature = hmac.digest('hex');
   
   if (generated_signature === razorpay_signature) {
     // Payment is verified
   }
   ```

3. **Create Razorpay Order** on backend before payment:
   ```javascript
   // Backend route
   app.post('/api/create-order', async (req, res) => {
     const order = await razorpay.orders.create({
       amount: req.body.amount,
       currency: 'USD',
       receipt: 'order_rcptid_11'
     });
     res.json(order);
   });
   ```

4. **Store orders in MongoDB** after successful verification

---

## Cart Functionality

### Features
- Add to cart from product page
- Quick add from product cards
- Update quantities
- Remove items
- Calculate subtotal, tax, shipping
- Free shipping on orders > $100
- Persistent cart (localStorage)

### Cart Data Structure
```javascript
{
  id: timestamp,
  productId: productId,
  name: "Product Name",
  price: 299,
  category: "Women",
  image: "image-url",
  selectedSize: "M",
  selectedColor: "#1a202c",
  quantity: 2
}
```

---

## Testing Checklist

### Admin Panel
- [ ] Login with credentials
- [ ] Add new product
- [ ] Edit existing product
- [ ] Delete product
- [ ] View dashboard statistics
- [ ] Logout

### Shopping Flow
- [ ] Browse products
- [ ] View product details
- [ ] Select size/color
- [ ] Add to cart
- [ ] Update cart quantities
- [ ] Remove from cart
- [ ] Proceed to checkout
- [ ] Complete payment
- [ ] Verify cart cleared

### Payment Gateway
- [ ] Razorpay modal opens
- [ ] Test card payment works
- [ ] Payment success shows confirmation
- [ ] Payment cancellation handled
- [ ] Failed payment shows error

---

## MongoDB Schema Suggestions

```javascript
// Product Schema
{
  name: String,
  category: String,
  price: Number,
  originalPrice: Number,
  description: String,
  image: String,
  colors: [String],
  sizes: [String],
  badge: String,
  stock: Number,
  createdAt: Date,
  updatedAt: Date
}

// Order Schema
{
  orderId: String,
  userId: ObjectId,
  items: [{
    productId: ObjectId,
    name: String,
    price: Number,
    quantity: Number,
    size: String,
    color: String
  }],
  total: Number,
  subtotal: Number,
  tax: Number,
  shipping: Number,
  paymentId: String,
  paymentStatus: String,
  orderStatus: String,
  createdAt: Date
}

// User Schema
{
  email: String,
  name: String,
  phone: String,
  isAdmin: Boolean,
  orders: [ObjectId],
  createdAt: Date
}
```

---

## Support

For issues or questions:
- Razorpay Docs: https://razorpay.com/docs/
- MongoDB Docs: https://docs.mongodb.com/
- React Router: https://reactrouter.com/

