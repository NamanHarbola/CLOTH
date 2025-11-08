import os
import logging
from fastapi import FastAPI, APIRouter, HTTPException, Body, status, Depends, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from pydantic_settings import BaseSettings
from typing import List, Optional, Any
from bson import ObjectId
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from fastapi.security import OAuth2PasswordBearer
import shutil # Import for file operations
from fastapi.staticfiles import StaticFiles # To serve uploaded files
import razorpay # Import Razorpay
import hmac # For mock verification
import hashlib

# --- Setup Uploads Directory ---
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# --- Configuration ---

class Settings(BaseSettings):
    MONGO_URL: str
    DB_NAME: str = "rishe" # <-- NAME CHANGE
    CORS_ORIGINS: str = "http://localhost:3000"
    # JWT Settings
    JWT_SECRET_KEY: str = "a_very_secret_key_please_change_this" # Change this in production
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # One week
    # Razorpay Settings
    RAZORPAY_KEY_ID: str = "YOUR_TEST_KEY_ID" # Add your key
    RAZORPAY_KEY_SECRET: str = "YOUR_TEST_KEY_SECRET" # Add your secret

    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'

# Load settings
try:
    settings = Settings()
except Exception as e:
    logging.error(f"Error loading settings: {e}")
    # Fallback for environments where .env might not be
    settings = Settings(
        MONGO_URL=os.environ.get("MONGO_URL", "mongodb://localhost:27017"), 
        DB_NAME=os.environ.get("DB_NAME", "rishe"), # <-- NAME CHANGE
        RAZORPAY_KEY_ID=os.environ.get("RAZORPAY_KEY_ID", "YOUR_TEST_KEY_ID"),
        RAZORPAY_KEY_SECRET=os.environ.get("RAZORPAY_KEY_SECRET", "YOUR_TEST_KEY_SECRET")
    )

# --- Init Razorpay Client ---
try:
    razorpay_client = razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )
    logging.info("Razorpay client initialized.")
except Exception as e:
    logging.warning(f"Could not initialize Razorpay client (is key/secret set?): {e}. Using mock.")
    razorpay_client = None


# --- Database Setup ---

client = AsyncIOMotorClient(settings.MONGO_URL)
db = client[settings.DB_NAME]

# Collections
product_collection = db.get_collection("products")
coupon_collection = db.get_collection("coupons")
user_collection = db.get_collection("users")
cart_collection = db.get_collection("carts")
content_collection = db.get_collection("site_content")
order_collection = db.get_collection("orders")


# --- Pydantic Models ---

# Helper for MongoDB ObjectId
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    @classmethod
    def validate(cls, v, *args, **kwargs):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)
    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")

# Base Model for MongoDB
class MongoBaseModel(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str},
    )

# User Model
class User(MongoBaseModel):
    email: EmailStr = Field(...)
    name: str = Field(...)
    picture: Optional[str] = None
    isAdmin: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.now)

class UserInDB(User):
    pass

class Token(BaseModel):
    access_token: str
    token_type: str
    
class TokenData(BaseModel):
    email: Optional[str] = None

# Product Model
class Product(MongoBaseModel):
    name: str = Field(...)
    category: str = Field(...)
    price: float = Field(...)
    originalPrice: Optional[float] = None
    description: Optional[str] = None
    image: str = Field(...)
    colors: Optional[List[str]] = []
    badge: Optional[str] = None
    model3DUrl: Optional[str] = None

class ProductCreate(BaseModel):
    name: str = Field(...)
    category: str = Field(...)
    price: float = Field(...)
    originalPrice: Optional[float] = None
    description: Optional[str] = None
    image: str = Field(...)
    colors: Optional[List[str]] = []
    badge: Optional[str] = None
    model3DUrl: Optional[str] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    originalPrice: Optional[float] = None
    description: Optional[str] = None
    image: Optional[str] = None
    colors: Optional[List[str]] = None
    badge: Optional[str] = None
    model3DUrl: Optional[str] = None

# Coupon Model
class Coupon(MongoBaseModel):
    code: str = Field(...)
    type: str = Field(...) # 'percentage' or 'fixed'
    value: float = Field(...)
    minOrder: Optional[float] = None
    maxDiscount: Optional[float] = None
    expiryDate: Optional[datetime] = None
    usageLimit: Optional[int] = None
    usedCount: int = Field(default=0)
    description: Optional[str] = None

class CouponCreate(BaseModel):
    code: str = Field(...)
    type: str = Field(...)
    value: float = Field(...)
    minOrder: Optional[float] = None
    maxDiscount: Optional[float] = None
    expiryDate: Optional[datetime] = None
    usageLimit: Optional[int] = None
    description: Optional[str] = None

class CouponUpdate(BaseModel):
    code: Optional[str] = None
    type: Optional[str] = None
    value: Optional[float] = None
    minOrder: Optional[float] = None
    maxDiscount: Optional[float] = None
    expiryDate: Optional[datetime] = None
    usageLimit: Optional[int] = None
    description: Optional[str] = None

# Cart Models
class CartItem(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    productId: str = Field(...) # Using str for product ID
    name: str = Field(...)
    price: float = Field(...)
    image: str = Field(...)
    category: str = Field(...)
    selectedSize: str = Field(...)
    selectedColor: str = Field(...)
    quantity: int = Field(ge=1)
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str},
    )

class CartItemCreate(BaseModel):
    productId: str = Field(...)
    name: str = Field(...)
    price: float = Field(...)
    image: str = Field(...)
    category: str = Field(...)
    selectedSize: str = Field(...)
    selectedColor: str = Field(...)
    quantity: int = Field(ge=1)

class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=1)

class Cart(MongoBaseModel):
    userId: PyObjectId = Field(...)
    items: List[CartItem] = Field(default_factory=list)
    updated_at: datetime = Field(default_factory=datetime.now)

# Site Content Models
class HeroContent(MongoBaseModel):
    key: str = Field(default="hero", unique=True)
    type: str = Field(default="image") # 'image' or 'video'
    url: str = Field(...)
    alt: Optional[str] = None

class HeroContentUpdate(BaseModel):
    type: str
    url: str
    alt: Optional[str] = None

class FileUploadResponse(BaseModel):
    message: str
    url: str

# Coupon Validation Models
class CouponValidateRequest(BaseModel):
    code: str
    subtotal: float

class CouponValidateResponse(Coupon):
    pass

# Order Models
class OrderAddress(BaseModel):
    name: str
    email: str

class Order(MongoBaseModel):
    userId: PyObjectId = Field(...)
    items: List[CartItem] = Field(...) # Store a snapshot of the items
    amount: float = Field(...)
    amount_subtotal: float = Field(...)
    amount_tax: float = Field(...)
    amount_shipping: float = Field(...)
    amount_discount: float = Field(default=0)
    
    status: str = Field(default="pending") # pending -> paid -> shipped
    razorpay_order_id: str = Field(...)
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None
    
    address: OrderAddress = Field(...)
    coupon_code: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)

class CreateOrderRequest(BaseModel):
    coupon_code: Optional[str] = None

class CreateOrderResponse(BaseModel):
    razorpay_key_id: str
    razorpay_order_id: str
    db_order_id: str
    amount: float
    user_name: str
    user_email: str

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    db_order_id: str
    
class VerifyPaymentResponse(BaseModel):
    status: str
    db_order_id: str


# --- FastAPI App & Router ---
app = FastAPI(title="RISHÉ API") # <-- NAME CHANGE

# Mount static directory to serve uploaded files
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

api_router = APIRouter(prefix="/api")

# --- Security & Auth ---

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    
    user = await user_collection.find_one({"email": token_data.email})
    if user is None:
        raise credentials_exception
    return fix_object_id(user) 

# --- Helper Function ---
def fix_object_id(doc):
    """Converts MongoDB's _id to a string field 'id'"""
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc

# --- Auth Endpoints ---

class GoogleLoginRequest(BaseModel):
    email: EmailStr
    name: str
    picture: Optional[str] = None

@api_router.post("/auth/google", response_model=Token)
async def login_with_google(login_data: GoogleLoginRequest):
    """
    Simulated Google Login.
    Finds a user by email or creates a new one.
    Returns a JWT.
    """
    user = await user_collection.find_one({"email": login_data.email})
    if not user:
        new_user = User(
            email=login_data.email,
            name=login_data.name,
            picture=login_data.picture,
            isAdmin=False
        )
        await user_collection.insert_one(new_user.model_dump(by_alias=True, exclude=["id"]))
    
    access_token = create_access_token(data={"sub": login_data.email})
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.post("/auth/admin/google", response_model=Token)
async def login_admin_with_google(login_data: GoogleLoginRequest):
    """
    Simulated Google Admin Login.
    Finds a user or creates one, AND ensures they are an admin.
    """
    user = await user_collection.find_one({"email": login_data.email})
    if not user:
        new_user = User(
            email=login_data.email,
            name=login_data.name,
            picture=login_data.picture,
            isAdmin=True
        )
        await user_collection.insert_one(new_user.model_dump(by_alias=True, exclude=["id"]))
    elif not user["isAdmin"]:
        await user_collection.update_one({"_id": user["_id"]}, {"$set": {"isAdmin": True}})

    access_token = create_access_token(data={"sub": login_data.email})
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.get("/auth/me", response_model=User)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    """
    Get the current user's data based on their JWT.
    """
    return current_user

# --- Product Endpoints ---

@api_router.post("/products", response_model=Product, status_code=status.HTTP_201_CREATED)
async def create_product(product: ProductCreate):
    product_dict = product.model_dump()
    new_product = await product_collection.insert_one(product_dict)
    created_product = await product_collection.find_one({"_id": new_product.inserted_id})
    return fix_object_id(created_product)

@api_router.get("/products", response_model=List[Product])
async def get_products():
    products = await product_collection.find().to_list(1000)
    return [fix_object_id(p) for p in products]

@api_router.get("/products/{id}", response_model=Product)
async def get_product(id: str):
    """
    Get a single product by its ID.
    """
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid product ID")
        
    product = await product_collection.find_one({"_id": ObjectId(id)})
    
    if product:
        return fix_object_id(product)
    raise HTTPException(status_code=404, detail=f"Product with id {id} not found")

@api_router.put("/products/{id}", response_model=Product)
async def update_product(id: str, product: ProductUpdate):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400, detail="Invalid product ID")
    update_data = product.model_dump(exclude_unset=True)
    if not update_data: raise HTTPException(status_code=400, detail="No update data provided")
    updated_product = await product_collection.find_one_and_update(
        {"_id": ObjectId(id)}, {"$set": update_data}, return_document=True
    )
    if updated_product: return fix_object_id(updated_product)
    raise HTTPException(status_code=404, detail=f"Product with id {id} not found")

@api_router.delete("/products/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(id: str):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400, detail="Invalid product ID")
    delete_result = await product_collection.delete_one({"_id": ObjectId(id)})
    if delete_result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=f"Product with id {id} not found")
    return

# --- Coupon Endpoints ---

@api_router.post("/coupons", response_model=Coupon, status_code=status.HTTP_201_CREATED)
async def create_coupon(coupon: CouponCreate):
    existing_coupon = await coupon_collection.find_one({"code": coupon.code.upper()})
    if existing_coupon: raise HTTPException(status_code=400, detail="Coupon code already exists")
    coupon_dict = coupon.model_dump()
    coupon_dict["code"] = coupon_dict["code"].upper()
    coupon_dict["usedCount"] = 0
    new_coupon = await coupon_collection.insert_one(coupon_dict)
    created_coupon = await coupon_collection.find_one({"_id": new_coupon.inserted_id})
    return fix_object_id(created_coupon)

@api_router.get("/coupons", response_model=List[Coupon])
async def get_coupons():
    coupons = await coupon_collection.find().to_list(1000)
    return [fix_object_id(c) for c in coupons]

@api_router.put("/coupons/{id}", response_model=Coupon)
async def update_coupon(id: str, coupon: CouponUpdate):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400, detail="Invalid coupon ID")
    update_data = coupon.model_dump(exclude_unset=True)
    if "code" in update_data:
        update_data["code"] = update_data["code"].upper()
        existing = await coupon_collection.find_one({"code": update_data["code"], "_id": {"$ne": ObjectId(id)}})
        if existing: raise HTTPException(status_code=400, detail="Coupon code already exists")
    if not update_data: raise HTTPException(status_code=400, detail="No update data provided")
    updated_coupon = await coupon_collection.find_one_and_update(
        {"_id": ObjectId(id)}, {"$set": update_data}, return_document=True
    )
    if updated_coupon: return fix_object_id(updated_coupon)
    raise HTTPException(status_code=404, detail=f"Coupon with id {id} not found")

@api_router.delete("/coupons/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_coupon(id: str):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400, detail="Invalid coupon ID")
    delete_result = await coupon_collection.delete_one({"_id": ObjectId(id)})
    if delete_result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=f"Coupon with id {id} not found")
    return

@api_router.post("/coupons/validate", response_model=CouponValidateResponse)
async def validate_coupon(request: CouponValidateRequest, current_user: dict = Depends(get_current_user)):
    """
    Validate a coupon code against the database and cart subtotal.
    """
    coupon = await coupon_collection.find_one({"code": request.code.upper()})

    if not coupon:
        raise HTTPException(status_code=404, detail="Invalid coupon code")

    if coupon.get("expiryDate") and coupon["expiryDate"] < datetime.now():
        raise HTTPException(status_code=400, detail="This coupon has expired")

    if coupon.get("usageLimit") and coupon.get("usedCount", 0) >= coupon["usageLimit"]:
        raise HTTPException(status_code=400, detail="This coupon has reached its usage limit")

    if coupon.get("minOrder") and request.subtotal < coupon["minOrder"]:
        raise HTTPException(status_code=400, detail=f"Minimum order of ₹{coupon['minOrder']} required")

    return fix_object_id(coupon)

# --- Cart Endpoints ---

@api_router.get("/cart", response_model=Cart)
async def get_cart(current_user: dict = Depends(get_current_user)):
    """
    Get the current user's cart. Creates one if it doesn't exist.
    """
    user_id = ObjectId(current_user["id"])
    cart = await cart_collection.find_one({"userId": user_id})
    if not cart:
        new_cart = Cart(userId=user_id, items=[])
        await cart_collection.insert_one(new_cart.model_dump(by_alias=True, exclude=["id"]))
        cart = await cart_collection.find_one({"userId": user_id})
    
    cart["items"] = [fix_object_id(item) for item in cart.get("items", [])]
    return fix_object_id(cart)

@api_router.post("/cart/items", response_model=Cart)
async def add_item_to_cart(item: CartItemCreate, current_user: dict = Depends(get_current_user)):
    """
    Add an item to the user's cart.
    If the item (with same product, size, and color) already exists, update its quantity.
    """
    user_id = ObjectId(current_user["id"])
    cart = await cart_collection.find_one({"userId": user_id})
    if not cart:
        cart_doc = Cart(userId=user_id, items=[]).model_dump(by_alias=True)
        await cart_collection.insert_one(cart_doc)
        cart = await cart_collection.find_one({"userId": user_id})

    item_exists = False
    for i, cart_item in enumerate(cart.get("items", [])):
        if (cart_item["productId"] == item.productId and
            cart_item["selectedSize"] == item.selectedSize and
            cart_item["selectedColor"] == item.selectedColor):
            
            new_quantity = cart_item["quantity"] + item.quantity
            await cart_collection.update_one(
                {"_id": cart["_id"], "items._id": cart_item["_id"]},
                {"$set": {f"items.{i}.quantity": new_quantity, "updated_at": datetime.now()}}
            )
            item_exists = True
            break
            
    if not item_exists:
        new_cart_item = CartItem(**item.model_dump())
        await cart_collection.update_one(
            {"_id": cart["_id"]},
            {"$push": {"items": new_cart_item.model_dump(by_alias=True)}, "$set": {"updated_at": datetime.now()}}
        )

    updated_cart = await cart_collection.find_one({"userId": user_id})
    updated_cart["items"] = [fix_object_id(item) for item in updated_cart.get("items", [])]
    return fix_object_id(updated_cart)

@api_router.put("/cart/items/{item_id}", response_model=Cart)
async def update_cart_item(item_id: str, item_update: CartItemUpdate, current_user: dict = Depends(get_current_user)):
    """
    Update a specific item's quantity in the cart.
    """
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item ID")
        
    user_id = ObjectId(current_user["id"])
    
    result = await cart_collection.update_one(
        {"userId": user_id, "items._id": ObjectId(item_id)},
        {"$set": {"items.$.quantity": item_update.quantity, "updated_at": datetime.now()}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Item not found in cart")

    updated_cart = await cart_collection.find_one({"userId": user_id})
    updated_cart["items"] = [fix_object_id(item) for item in updated_cart.get("items", [])]
    return fix_object_id(updated_cart)

@api_router.delete("/cart/items/{item_id}", response_model=Cart)
async def remove_cart_item(item_id: str, current_user: dict = Depends(get_current_user)):
    """
    Remove a specific item from the cart.
    """
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item ID")
        
    user_id = ObjectId(current_user["id"])
    
    result = await cart_collection.update_one(
        {"userId": user_id},
        {"$pull": {"items": {"_id": ObjectId(item_id)}}}
    )

    if result.modified_count == 0:
        pass

    updated_cart = await cart_collection.find_one({"userId": user_id})
    if not updated_cart:
         return {"id": "null", "userId": user_id, "items": [], "updated_at": datetime.now()}
         
    updated_cart["items"] = [fix_object_id(item) for item in updated_cart.get("items", [])]
    return fix_object_id(updated_cart)

# --- File Upload & Content Endpoints ---

@api_router.post("/upload", response_model=FileUploadResponse)
async def upload_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """
    Upload a file. Only admins can upload.
    Saves to './uploads'
    """
    if not current_user.get("isAdmin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
        
    try:
        filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{file.filename.replace(' ', '_')}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        file_url = f"/uploads/{filename}"
        return {"message": "File uploaded successfully", "url": file_url}
        
    except Exception as e:
        logger.error(f"File upload failed: {e}")
        raise HTTPException(status_code=500, detail="Could not upload file")
    finally:
        file.file.close()

@api_router.get("/content/hero", response_model=HeroContent)
async def get_hero_content():
    """
    Get the current hero content.
    """
    hero_content = await content_collection.find_one({"key": "hero"})
    if hero_content:
        return fix_object_id(hero_content)
    
    # Return a default if not set
    return HeroContent(
        id=ObjectId(), # provide a mock BSON ID
        key="hero", 
        type="image", 
        url="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1920&q=80", 
        alt="Fashion Model"
    )

@api_router.post("/content/hero", response_model=HeroContent)
async def update_hero_content(content: HeroContentUpdate, current_user: dict = Depends(get_current_user)):
    """
    Update the hero content. Only admins can do this.
    """
    if not current_user.get("isAdmin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    update_data = content.model_dump()
    updated_content = await content_collection.find_one_and_update(
        {"key": "hero"},
        {"$set": update_data, "$setOnInsert": {"key": "hero"}},
        upsert=True,
        return_document=True
    )
    return fix_object_id(updated_content)

# --- Order & Payment Endpoints ---

@api_router.post("/orders/create", response_model=CreateOrderResponse)
async def create_order(request: CreateOrderRequest, current_user: dict = Depends(get_current_user)):
    """
    1. Get user's cart
    2. Validate coupon (if any)
    3. Calculate final total
    4. Create Razorpay order
    5. Create Order in DB with status "pending"
    6. Return Razorpay details to frontend
    """
    user_id = ObjectId(current_user["id"])
    cart = await cart_collection.find_one({"userId": user_id})
    
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Your cart is empty")

    items = [CartItem(**fix_object_id(item)) for item in cart["items"]]
    
    # --- 1. Calculate Totals (Server-side) ---
    subtotal = sum(item.price * item.quantity for item in items)
    discount = 0
    coupon = None

    if request.coupon_code:
        try:
            coupon_validate_req = CouponValidateRequest(code=request.coupon_code, subtotal=subtotal)
            coupon = await validate_coupon(coupon_validate_req, current_user) # Use existing function
            if coupon.type == 'percentage':
                discount = (subtotal * coupon.value) / 100
                if coupon.maxDiscount and discount > coupon.maxDiscount:
                    discount = coupon.maxDiscount
            else:
                discount = coupon.value
        except HTTPException as e:
            logging.warning(f"Invalid coupon applied during order creation: {e.detail}")
            
    shipping = 0 if (subtotal - discount) > 5000 else 99
    tax = (subtotal - discount) * 0.18
    total = subtotal - discount + shipping + tax
    
    # --- 2. Create Razorpay Order ---
    razorpay_order_data = {
        "amount": int(total * 100), # Amount in paise
        "currency": "INR",
        "receipt": f"order_rcpt_{user_id}_{datetime.now().timestamp()}"
    }
    
    try:
        if razorpay_client:
            razorpay_order = razorpay_client.order.create(data=razorpay_order_data)
            razorpay_order_id = razorpay_order['id']
        else:
            logging.warning("Mocking Razorpay order creation")
            razorpay_order_id = f"mock_order_{ObjectId()}"
            
    except Exception as e:
        logging.error(f"Razorpay order creation failed: {e}")
        raise HTTPException(status_code=500, detail="Payment gateway error, please try again.")

    # --- 3. Create Order in DB ---
    new_order = Order(
        userId=user_id,
        items=items,
        amount=round(total, 2),
        amount_subtotal=round(subtotal, 2),
        amount_tax=round(tax, 2),
        amount_shipping=round(shipping, 2),
        amount_discount=round(discount, 2),
        status="pending",
        razorpay_order_id=razorpay_order_id,
        address=OrderAddress(name=current_user["name"], email=current_user["email"]),
        coupon_code=coupon.code if coupon else None
    )
    
    inserted = await order_collection.insert_one(new_order.model_dump(by_alias=True, exclude=["id"]))
    db_order_id = str(inserted.inserted_id)
    
    return CreateOrderResponse(
        razorpay_key_id=settings.RAZORPAY_KEY_ID,
        razorpay_order_id=razorpay_order_id,
        db_order_id=db_order_id,
        amount=round(total, 2),
        user_name=current_user["name"],
        user_email=current_user["email"]
    )

@api_router.post("/orders/verify", response_model=VerifyPaymentResponse)
async def verify_payment(request: VerifyPaymentRequest, current_user: dict = Depends(get_current_user)):
    """
    1. (Mock) Verify Razorpay signature
    2. Update Order status to "paid"
    3. Clear user's cart
    4. Update coupon usage
    """
    
    # --- 1. Verify Signature ---
    payment_verified = False
    if not settings.RAZORPAY_KEY_SECRET.startswith("YOUR_TEST_KEY_SECRET"):
        try:
            params_dict = {
                'razorpay_order_id': request.razorpay_order_id,
                'razorpay_payment_id': request.razorpay_payment_id,
                'razorpay_signature': request.razorpay_signature
            }
            razorpay_client.utility.verify_payment_signature(params_dict)
            payment_verified = True
        except razorpay.errors.SignatureVerificationError:
            payment_verified = False
    else:
        logging.warning("Mocking payment verification. DO NOT use this in production.")
        payment_verified = True 

    if not payment_verified:
        raise HTTPException(status_code=400, detail="Payment verification failed")

    # --- 2. Update Order in DB ---
    order = await order_collection.find_one({"_id": ObjectId(request.db_order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    await order_collection.update_one(
        {"_id": order["_id"]},
        {"$set": {
            "status": "paid",
            "razorpay_payment_id": request.razorpay_payment_id,
            "razorpay_signature": request.razorpay_signature
        }}
    )
    
    # --- 3. Clear User's Cart ---
    await cart_collection.update_one(
        {"userId": ObjectId(current_user["id"])},
        {"$set": {"items": []}}
    )
    
    # --- 4. Update Coupon Usage ---
    if order.get("coupon_code"):
        await coupon_collection.update_one(
            {"code": order["coupon_code"]},
            {"$inc": {"usedCount": 1}}
        )

    return VerifyPaymentResponse(status="paid", db_order_id=request.db_order_id)


# --- App Setup ---
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

@app.get("/")
def read_root():
    return {"message": "Welcome to the RISHÉ API"} # <-- NAME CHANGE