# main.py
import os
import shutil
import logging
from datetime import datetime, timedelta, timezone

from typing import Any, List, Optional

from fastapi import FastAPI, APIRouter, HTTPException, Body, status, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer

from pydantic import BaseModel, Field, EmailStr
from pydantic import ConfigDict

from pydantic_core import core_schema
from bson import ObjectId

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument

from jose import JWTError, jwt

import razorpay

# -------------------------
# Logging (early)
# -------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("rishe_api")

# -------------------------
# Upload dir
# -------------------------
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# -------------------------
# Settings
# -------------------------
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MONGO_URL: str
    DB_NAME: str = "rishe"
    CORS_ORIGINS: str = "http://localhost:3000"
    JWT_SECRET_KEY: str = "a_very_secret_key_please_change_this"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    RAZORPAY_KEY_ID: str = "YOUR_TEST_KEY_ID"
    RAZORPAY_KEY_SECRET: str = "YOUR_TEST_KEY_SECRET"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


try:
    settings = Settings()
except Exception as e:
    logger.warning(f"Settings load failed from .env, falling back to env variables: {e}")
    settings = Settings(
        MONGO_URL=os.environ.get("MONGO_URL", "mongodb://localhost:27017"),
        DB_NAME=os.environ.get("DB_NAME", "rishe"),
        RAZORPAY_KEY_ID=os.environ.get("RAZORPAY_KEY_ID", "YOUR_TEST_KEY_ID"),
        RAZORPAY_KEY_SECRET=os.environ.get("RAZORPAY_KEY_SECRET", "YOUR_TEST_KEY_SECRET"),
    )

# -------------------------
# Razorpay client init
# -------------------------
try:
    razorpay_client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
    logger.info("Razorpay client initialized.")
except Exception as e:
    logger.warning(f"Could not initialize Razorpay client (is key/secret set?): {e}. Using mock.")
    razorpay_client = None

# -------------------------
# Database (Motor)
# -------------------------
client = AsyncIOMotorClient(settings.MONGO_URL)
db = client[settings.DB_NAME]

product_collection = db.get_collection("products")
coupon_collection = db.get_collection("coupons")
user_collection = db.get_collection("users")
cart_collection = db.get_collection("carts")
content_collection = db.get_collection("site_content")
order_collection = db.get_collection("orders")

# -------------------------
# Pydantic / MongoDB helpers
# -------------------------
class PyObjectId(ObjectId):
    """
    Pydantic v2 compatible ObjectId type.
    Validates from str/ObjectId and provides JSON schema as string.
    Model-level json_encoders are also used to turn ObjectId -> str when serializing.
    """

    @classmethod
    def __get_pydantic_core_schema__(cls, source, handler):
        def validate_object_id(v: Any, _info):
            if isinstance(v, ObjectId):
                return v
            if isinstance(v, str) and ObjectId.is_valid(v):
                return ObjectId(v)
            raise ValueError("Invalid ObjectId")

        return core_schema.no_info_plain_validator_function(validate_object_id)

    @classmethod
    def __get_pydantic_json_schema__(cls, core_schema, handler):
        # Represent as string in OpenAPI / JSON schema
        return {"type": "string", "format": "hexadecimal"}

# Base model for Mongo-style documents
class MongoBaseModel(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str},
    )

# -------------------------
# Models
# -------------------------
def now_utc():
    return datetime.now(timezone.utc)


class User(MongoBaseModel):
    email: EmailStr = Field(...)
    name: str = Field(...)
    picture: Optional[str] = None
    isAdmin: bool = Field(default=False)
    created_at: datetime = Field(default_factory=now_utc)


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


class Product(MongoBaseModel):
    name: str
    category: str
    price: float
    originalPrice: Optional[float] = None
    description: Optional[str] = None
    image: str
    colors: Optional[List[str]] = []
    badge: Optional[str] = None
    model3DUrl: Optional[str] = None


class ProductCreate(BaseModel):
    name: str
    category: str
    price: float
    originalPrice: Optional[float] = None
    description: Optional[str] = None
    image: str
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


class Coupon(MongoBaseModel):
    code: str
    type: str  # ideally 'percentage' or 'fixed'
    value: float
    minOrder: Optional[float] = None
    maxDiscount: Optional[float] = None
    expiryDate: Optional[datetime] = None
    usageLimit: Optional[int] = None
    usedCount: int = Field(default=0)
    description: Optional[str] = None


class CouponCreate(BaseModel):
    code: str
    type: str
    value: float
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


class CartItem(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    productId: str
    name: str
    price: float
    image: str
    category: str
    selectedSize: str
    selectedColor: str
    quantity: int = Field(ge=1)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str},
    )


class CartItemCreate(BaseModel):
    productId: str
    name: str
    price: float
    image: str
    category: str
    selectedSize: str
    selectedColor: str
    quantity: int = Field(ge=1)


class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=1)


class Cart(MongoBaseModel):
    userId: PyObjectId
    items: List[CartItem] = Field(default_factory=list)
    updated_at: datetime = Field(default_factory=now_utc)


class HeroContent(MongoBaseModel):
    key: str = Field(default="hero")
    type: str = Field(default="image")  # 'image' or 'video'
    url: str = Field(...)
    alt: Optional[str] = None


class HeroContentUpdate(BaseModel):
    type: str
    url: str
    alt: Optional[str] = None


class FileUploadResponse(BaseModel):
    message: str
    url: str


class CouponValidateRequest(BaseModel):
    code: str
    subtotal: float


class CouponValidateResponse(Coupon):
    pass


class OrderAddress(BaseModel):
    name: str
    email: str


class Order(MongoBaseModel):
    userId: PyObjectId
    items: List[CartItem]
    amount: float
    amount_subtotal: float
    amount_tax: float
    amount_shipping: float
    amount_discount: float = Field(default=0)
    status: str = Field(default="pending")
    razorpay_order_id: str = Field(...)
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None
    address: OrderAddress
    coupon_code: Optional[str] = None
    created_at: datetime = Field(default_factory=now_utc)


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


class GoogleLoginRequest(BaseModel):
    email: EmailStr
    name: str
    picture: Optional[str] = None


# -------------------------
# FastAPI app & router
# -------------------------
app = FastAPI(title="RISHÉ API")
api_router = APIRouter(prefix="/api")

# mount static uploads
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# -------------------------
# Auth utilities
# -------------------------
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/google")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "sub": data.get("sub")})
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
    except JWTError as e:
        logger.debug(f"JWT decode error: {e}")
        raise credentials_exception

    user = await user_collection.find_one({"email": token_data.email})
    if user is None:
        raise credentials_exception
    return fix_object_id(user)


# -------------------------
# Helper functions
# -------------------------
def fix_object_id(doc: dict):
    """Convert Mongo _id to id string and return dict copy."""
    if not doc:
        return doc
    if "_id" in doc:
        doc = dict(doc)  # shallow copy
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    # For nested items, we assume those fields were converted on read when needed
    return doc


async def get_valid_coupon(code: str, subtotal: float):
    """Internal helper (not a FastAPI dependency) that validates coupon and returns coupon dict or raises HTTPException."""
    if not code:
        return None
    coupon = await coupon_collection.find_one({"code": code.upper()})
    if not coupon:
        raise HTTPException(status_code=404, detail="Invalid coupon code")

    # ensure datetime comparisons are timezone-aware
    expiry = coupon.get("expiryDate")
    if expiry and isinstance(expiry, datetime) and expiry.tzinfo is None:
        # assume stored as naive -> interpret as UTC
        expiry = expiry.replace(tzinfo=timezone.utc)

    if expiry and expiry < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="This coupon has expired")

    if coupon.get("usageLimit") and coupon.get("usedCount", 0) >= coupon["usageLimit"]:
        raise HTTPException(status_code=400, detail="This coupon has reached its usage limit")

    if coupon.get("minOrder") and subtotal < coupon["minOrder"]:
        raise HTTPException(status_code=400, detail=f"Minimum order of ₹{coupon['minOrder']} required")

    return coupon


# -------------------------
# Auth endpoints
# -------------------------
@api_router.post("/auth/google", response_model=Token)
async def login_with_google(login_data: GoogleLoginRequest):
    user = await user_collection.find_one({"email": login_data.email})
    if not user:
        new_user = User(email=login_data.email, name=login_data.name, picture=login_data.picture, isAdmin=False)
        await user_collection.insert_one(new_user.model_dump(by_alias=True, exclude=["id"]))
    access_token = create_access_token(data={"sub": login_data.email})
    return {"access_token": access_token, "token_type": "bearer"}


@api_router.post("/auth/admin/google", response_model=Token)
async def login_admin_with_google(login_data: GoogleLoginRequest):
    user = await user_collection.find_one({"email": login_data.email})
    if not user:
        new_user = User(email=login_data.email, name=login_data.name, picture=login_data.picture, isAdmin=True)
        await user_collection.insert_one(new_user.model_dump(by_alias=True, exclude=["id"]))
    elif not user.get("isAdmin"):
        await user_collection.update_one({"_id": user["_id"]}, {"$set": {"isAdmin": True}})
    access_token = create_access_token(data={"sub": login_data.email})
    return {"access_token": access_token, "token_type": "bearer"}


@api_router.get("/auth/me", response_model=User)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return current_user


# -------------------------
# Product endpoints
# -------------------------
@api_router.post("/products", response_model=Product, status_code=status.HTTP_201_CREATED)
async def create_product(product: ProductCreate):
    product_dict = product.model_dump()
    inserted = await product_collection.insert_one(product_dict)
    created = await product_collection.find_one({"_id": inserted.inserted_id})
    return fix_object_id(created)


@api_router.get("/products", response_model=List[Product])
async def get_products():
    products = await product_collection.find().to_list(1000)
    return [fix_object_id(p) for p in products]


@api_router.get("/products/{id}", response_model=Product)
async def get_product(id: str):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid product ID")
    product = await product_collection.find_one({"_id": ObjectId(id)})
    if product:
        return fix_object_id(product)
    raise HTTPException(status_code=404, detail=f"Product with id {id} not found")


@api_router.put("/products/{id}", response_model=Product)
async def update_product(id: str, product: ProductUpdate):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid product ID")
    update_data = product.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")

    updated_product = await product_collection.find_one_and_update(
        {"_id": ObjectId(id)},
        {"$set": update_data},
        return_document=ReturnDocument.AFTER,
    )
    if updated_product:
        return fix_object_id(updated_product)
    raise HTTPException(status_code=404, detail=f"Product with id {id} not found")


@api_router.delete("/products/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(id: str):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid product ID")
    result = await product_collection.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=f"Product with id {id} not found")
    return


# -------------------------
# Coupon endpoints
# -------------------------
@api_router.post("/coupons", response_model=Coupon, status_code=status.HTTP_201_CREATED)
async def create_coupon(coupon: CouponCreate):
    code_upper = coupon.code.upper()
    existing_coupon = await coupon_collection.find_one({"code": code_upper})
    if existing_coupon:
        raise HTTPException(status_code=400, detail="Coupon code already exists")

    coupon_dict = coupon.model_dump()
    coupon_dict["code"] = code_upper
    coupon_dict["usedCount"] = 0
    inserted = await coupon_collection.insert_one(coupon_dict)
    created = await coupon_collection.find_one({"_id": inserted.inserted_id})
    return fix_object_id(created)


@api_router.get("/coupons", response_model=List[Coupon])
async def get_coupons():
    coupons = await coupon_collection.find().to_list(1000)
    return [fix_object_id(c) for c in coupons]


@api_router.put("/coupons/{id}", response_model=Coupon)
async def update_coupon(id: str, coupon: CouponUpdate):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid coupon ID")
    update_data = coupon.model_dump(exclude_unset=True)
    if "code" in update_data:
        update_data["code"] = update_data["code"].upper()
        existing = await coupon_collection.find_one({"code": update_data["code"], "_id": {"$ne": ObjectId(id)}})
        if existing:
            raise HTTPException(status_code=400, detail="Coupon code already exists")
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")

    updated_coupon = await coupon_collection.find_one_and_update(
        {"_id": ObjectId(id)},
        {"$set": update_data},
        return_document=ReturnDocument.AFTER,
    )
    if updated_coupon:
        return fix_object_id(updated_coupon)
    raise HTTPException(status_code=404, detail=f"Coupon with id {id} not found")


@api_router.delete("/coupons/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_coupon(id: str):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid coupon ID")
    result = await coupon_collection.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=f"Coupon with id {id} not found")
    return


@api_router.post("/coupons/validate", response_model=CouponValidateResponse)
async def validate_coupon_endpoint(request: CouponValidateRequest, current_user: dict = Depends(get_current_user)):
    """Endpoint wrapper that uses the internal get_valid_coupon helper."""
    coupon = await get_valid_coupon(request.code, request.subtotal)
    return fix_object_id(coupon)


# -------------------------
# Cart endpoints
# -------------------------
@api_router.get("/cart", response_model=Cart)
async def get_cart(current_user: dict = Depends(get_current_user)):
    user_id = ObjectId(current_user["id"])
    cart = await cart_collection.find_one({"userId": user_id})
    if not cart:
        new_cart = Cart(userId=user_id, items=[]).model_dump(by_alias=True)
        await cart_collection.insert_one(new_cart)
        cart = await cart_collection.find_one({"userId": user_id})

    # convert nested item _id -> id in items
    cart_items = []
    for item in cart.get("items", []):
        if "_id" in item:
            item["id"] = str(item["_id"])
            del item["_id"]
        cart_items.append(item)
    cart["items"] = cart_items
    return fix_object_id(cart)


@api_router.post("/cart/items", response_model=Cart)
async def add_item_to_cart(item: CartItemCreate, current_user: dict = Depends(get_current_user)):
    user_id = ObjectId(current_user["id"])
    cart = await cart_collection.find_one({"userId": user_id})
    if not cart:
        cart_doc = Cart(userId=user_id, items=[]).model_dump(by_alias=True)
        await cart_collection.insert_one(cart_doc)
        cart = await cart_collection.find_one({"userId": user_id})

    # Check for existing item match by productId + size + color
    items = cart.get("items", [])
    item_found = False
    for i, cart_item in enumerate(items):
        if (cart_item.get("productId") == item.productId and
                cart_item.get("selectedSize") == item.selectedSize and
                cart_item.get("selectedColor") == item.selectedColor):
            new_qty = cart_item.get("quantity", 0) + item.quantity
            # update specific array element using positional index
            await cart_collection.update_one(
                {"_id": cart["_id"], "items._id": cart_item["_id"]},
                {"$set": {f"items.{i}.quantity": new_qty, "updated_at": now_utc()}}
            )
            item_found = True
            break

    if not item_found:
        new_cart_item = CartItem(**item.model_dump())
        await cart_collection.update_one(
            {"_id": cart["_id"]},
            {"$push": {"items": new_cart_item.model_dump(by_alias=True)}, "$set": {"updated_at": now_utc()}}
        )

    updated_cart = await cart_collection.find_one({"userId": user_id})
    # convert nested ids
    for it in updated_cart.get("items", []):
        if "_id" in it:
            it["id"] = str(it["_id"])
            del it["_id"]
    return fix_object_id(updated_cart)


@api_router.put("/cart/items/{item_id}", response_model=Cart)
async def update_cart_item(item_id: str, item_update: CartItemUpdate, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item ID")
    user_id = ObjectId(current_user["id"])
    result = await cart_collection.update_one(
        {"userId": user_id, "items._id": ObjectId(item_id)},
        {"$set": {"items.$.quantity": int(item_update.quantity), "updated_at": now_utc()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Item not found in cart")
    updated_cart = await cart_collection.find_one({"userId": user_id})
    for it in updated_cart.get("items", []):
        if "_id" in it:
            it["id"] = str(it["_id"])
            del it["_id"]
    return fix_object_id(updated_cart)


@api_router.delete("/cart/items/{item_id}", response_model=Cart)
async def remove_cart_item(item_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item ID")
    user_id = ObjectId(current_user["id"])
    await cart_collection.update_one({"userId": user_id}, {"$pull": {"items": {"_id": ObjectId(item_id)}}})
    updated_cart = await cart_collection.find_one({"userId": user_id})
    if not updated_cart:
        # return empty cart shape
        return {"id": "null", "userId": str(user_id), "items": [], "updated_at": now_utc()}
    for it in updated_cart.get("items", []):
        if "_id" in it:
            it["id"] = str(it["_id"])
            del it["_id"]
    return fix_object_id(updated_cart)


# -------------------------
# File upload & content endpoints
# -------------------------
@api_router.post("/upload", response_model=FileUploadResponse)
async def upload_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
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
        try:
            file.file.close()
        except Exception:
            pass


@api_router.get("/content/hero", response_model=HeroContent)
async def get_hero_content():
    hero_content = await content_collection.find_one({"key": "hero"})
    if hero_content:
        return fix_object_id(hero_content)
    # default (return dict that fits HeroContent)
    default = {
        "_id": PyObjectId(),
        "key": "hero",
        "type": "image",
        "url": "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1920&q=80",
        "alt": "Fashion Model"
    }
    return fix_object_id(default)


@api_router.post("/content/hero", response_model=HeroContent)
async def update_hero_content(content: HeroContentUpdate, current_user: dict = Depends(get_current_user)):
    if not current_user.get("isAdmin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    update_data = content.model_dump()
    updated = await content_collection.find_one_and_update(
        {"key": "hero"},
        {"$set": update_data, "$setOnInsert": {"key": "hero"}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return fix_object_id(updated)


# -------------------------
# Orders & Payments
# -------------------------
@api_router.post("/orders/create", response_model=CreateOrderResponse)
async def create_order(request: CreateOrderRequest, current_user: dict = Depends(get_current_user)):
    user_id = ObjectId(current_user["id"])
    cart = await cart_collection.find_one({"userId": user_id})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Your cart is empty")

    # Prepare items
    items = []
    for it in cart.get("items", []):
        # ensure nested _id converted to id string for CartItem constructor
        if "_id" in it:
            it["id"] = str(it["_id"])
        items.append(CartItem(**it))

    subtotal = sum(item.price * item.quantity for item in items)
    discount = 0.0
    coupon_obj = None

    if request.coupon_code:
        try:
            coupon_doc = await get_valid_coupon(request.coupon_code, subtotal)
            # local coupon usage
            coupon_obj = Coupon(**coupon_doc)
            if coupon_obj.type == "percentage":
                discount = (subtotal * coupon_obj.value) / 100.0
                if coupon_obj.maxDiscount and discount > coupon_obj.maxDiscount:
                    discount = coupon_obj.maxDiscount
            else:
                discount = coupon_obj.value
        except HTTPException as e:
            # log and continue with no coupon
            logger.warning(f"Invalid coupon at order creation: {e.detail}")
            coupon_obj = None
            discount = 0.0

    shipping = 0 if (subtotal - discount) > 5000 else 99
    tax = (subtotal - discount) * 0.18
    total = subtotal - discount + shipping + tax

    razorpay_order_id = None
    try:
        amount_paise = int(round(total * 100))
        if razorpay_client and not settings.RAZORPAY_KEY_SECRET.startswith("YOUR_TEST_KEY_SECRET"):
            razorpay_order = razorpay_client.order.create(data={
                "amount": amount_paise,
                "currency": "INR",
                "receipt": f"order_rcpt_{user_id}_{datetime.now().timestamp()}"
            })
            razorpay_order_id = razorpay_order["id"]
        else:
            logger.warning("Mocking Razorpay order creation (test secret or client missing).")
            razorpay_order_id = f"mock_order_{PyObjectId()}"
    except Exception as e:
        logger.error(f"Razorpay order creation failed: {e}")
        raise HTTPException(status_code=500, detail="Payment gateway error, please try again.")

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
        coupon_code=coupon_obj.code if coupon_obj else None,
    )

    inserted = await order_collection.insert_one(new_order.model_dump(by_alias=True, exclude=["id"]))
    db_order_id = str(inserted.inserted_id)

    return CreateOrderResponse(
        razorpay_key_id=settings.RAZORPAY_KEY_ID,
        razorpay_order_id=razorpay_order_id,
        db_order_id=db_order_id,
        amount=round(total, 2),
        user_name=current_user["name"],
        user_email=current_user["email"],
    )


@api_router.post("/orders/verify", response_model=VerifyPaymentResponse)
async def verify_payment(request: VerifyPaymentRequest, current_user: dict = Depends(get_current_user)):
    payment_verified = False
    if not settings.RAZORPAY_KEY_SECRET.startswith("YOUR_TEST_KEY_SECRET") and razorpay_client:
        try:
            params_dict = {
                "razorpay_order_id": request.razorpay_order_id,
                "razorpay_payment_id": request.razorpay_payment_id,
                "razorpay_signature": request.razorpay_signature,
            }
            razorpay_client.utility.verify_payment_signature(params_dict)
            payment_verified = True
        except razorpay.errors.SignatureVerificationError:
            payment_verified = False
        except Exception as e:
            logger.error(f"Razorpay signature verification error: {e}")
            payment_verified = False
    else:
        logger.warning("Mocking payment verification (test secret or client missing). DO NOT use in production.")
        payment_verified = True

    if not payment_verified:
        raise HTTPException(status_code=400, detail="Payment verification failed")

    order = await order_collection.find_one({"_id": ObjectId(request.db_order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    await order_collection.update_one(
        {"_id": order["_id"]},
        {"$set": {
            "status": "paid",
            "razorpay_payment_id": request.razorpay_payment_id,
            "razorpay_signature": request.razorpay_signature,
        }}
    )

    # clear cart
    await cart_collection.update_one({"userId": ObjectId(current_user["id"])}, {"$set": {"items": []}})
    # update coupon usage
    if order.get("coupon_code"):
        await coupon_collection.update_one({"code": order["coupon_code"]}, {"$inc": {"usedCount": 1}})

    return VerifyPaymentResponse(status="paid", db_order_id=request.db_order_id)


# -------------------------
# App startup/shutdown events
# -------------------------
@app.on_event("startup")
async def startup():
    # Create indexes for uniqueness and performance
    try:
        await coupon_collection.create_index("code", unique=True)
        await user_collection.create_index("email", unique=True)
        await product_collection.create_index("name")
        logger.info("Indexes ensured on startup.")
    except Exception as e:
        logger.warning(f"Could not create indexes on startup: {e}")


@app.on_event("shutdown")
async def shutdown():
    client.close()
    logger.info("MongoDB client closed.")


# -------------------------
# App include router & CORS
# -------------------------
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------------
# Root
# -------------------------
@app.get("/")
def read_root():
    return {"message": "Welcome to the RISHÉ API"}
