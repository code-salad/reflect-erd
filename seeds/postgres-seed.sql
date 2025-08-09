-- PostgreSQL seed script for testing
-- Drop and recreate test schema and tables

-- Drop views first
DROP VIEW IF EXISTS public.order_summary CASCADE;

-- Drop existing tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;

-- Drop test schema tables
DROP TABLE IF EXISTS test_schema.users CASCADE;
DROP SCHEMA IF EXISTS test_schema CASCADE;

-- Create categories table
CREATE TABLE public.categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create customers table
CREATE TABLE public.customers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create products table
CREATE TABLE public.products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    sku VARCHAR(100) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create orders table
CREATE TABLE public.orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    shipping_address TEXT,
    billing_address TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create order_items table (junction table for many-to-many relationship)
CREATE TABLE public.order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    discount_percent DECIMAL(5, 2) DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(order_id, product_id)
);

-- Create indexes for better performance
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_products_active ON products(is_active);

-- Insert sample data

-- Categories
INSERT INTO public.categories (name, description) VALUES
('Electronics', 'Electronic devices and accessories'),
('Books', 'Physical and digital books'),
('Clothing', 'Men and women apparel'),
('Home & Garden', 'Home improvement and gardening supplies'),
('Sports', 'Sports equipment and accessories');

-- Customers
INSERT INTO public.customers (email, first_name, last_name, phone, address, city, country, postal_code) VALUES
('john.doe@example.com', 'John', 'Doe', '+1234567890', '123 Main St', 'New York', 'USA', '10001'),
('jane.smith@example.com', 'Jane', 'Smith', '+1234567891', '456 Oak Ave', 'Los Angeles', 'USA', '90001'),
('bob.johnson@example.com', 'Bob', 'Johnson', '+1234567892', '789 Pine Rd', 'Chicago', 'USA', '60601'),
('alice.williams@example.com', 'Alice', 'Williams', '+1234567893', '321 Elm St', 'Houston', 'USA', '77001'),
('charlie.brown@example.com', 'Charlie', 'Brown', '+1234567894', '654 Maple Dr', 'Phoenix', 'USA', '85001');

-- Products
INSERT INTO public.products (name, description, price, stock_quantity, category_id, sku, is_active) VALUES
('Laptop Pro 15', 'High-performance laptop with 15-inch display', 1299.99, 50, 1, 'LPRO15-001', true),
('Wireless Mouse', 'Ergonomic wireless mouse with long battery life', 29.99, 200, 1, 'WM-002', true),
('The Great Novel', 'Bestselling fiction book', 19.99, 100, 2, 'BOOK-001', true),
('Programming Guide', 'Complete guide to modern programming', 49.99, 75, 2, 'BOOK-002', true),
('Cotton T-Shirt', 'Comfortable cotton t-shirt', 24.99, 150, 3, 'SHIRT-001', true),
('Denim Jeans', 'Classic denim jeans', 59.99, 100, 3, 'JEANS-001', true),
('Garden Shovel', 'Durable garden shovel', 34.99, 50, 4, 'TOOL-001', true),
('Plant Seeds Pack', 'Variety pack of vegetable seeds', 9.99, 200, 4, 'SEEDS-001', true),
('Tennis Racket', 'Professional tennis racket', 89.99, 30, 5, 'SPORT-001', true),
('Running Shoes', 'Comfortable running shoes', 79.99, 80, 5, 'SHOES-001', true);

-- Orders
INSERT INTO public.orders (customer_id, status, total_amount, shipping_address, billing_address, notes) VALUES
(1, 'completed', 1329.98, '123 Main St, New York, USA 10001', '123 Main St, New York, USA 10001', 'Please deliver to front door'),
(2, 'processing', 89.97, '456 Oak Ave, Los Angeles, USA 90001', '456 Oak Ave, Los Angeles, USA 90001', NULL),
(3, 'pending', 169.97, '789 Pine Rd, Chicago, USA 60601', '789 Pine Rd, Chicago, USA 60601', 'Gift wrapping requested'),
(1, 'completed', 59.99, '123 Main St, New York, USA 10001', '123 Main St, New York, USA 10001', NULL),
(4, 'shipped', 134.97, '321 Elm St, Houston, USA 77001', '321 Elm St, Houston, USA 77001', 'Express delivery');

-- Order Items
INSERT INTO public.order_items (order_id, product_id, quantity, unit_price, discount_percent) VALUES
(1, 1, 1, 1299.99, 0),
(1, 2, 1, 29.99, 0),
(2, 3, 2, 19.99, 0),
(2, 4, 1, 49.99, 0),
(3, 9, 1, 89.99, 0),
(3, 10, 1, 79.99, 0),
(4, 6, 1, 59.99, 0),
(5, 5, 2, 24.99, 0),
(5, 7, 1, 34.99, 0),
(5, 4, 1, 49.99, 0);

-- Create a view for order summaries
CREATE OR REPLACE VIEW public.order_summary AS
SELECT 
    o.id as order_id,
    c.email as customer_email,
    c.first_name || ' ' || c.last_name as customer_name,
    o.order_date,
    o.status,
    o.total_amount,
    COUNT(oi.id) as item_count,
    SUM(oi.quantity) as total_items
FROM orders o
JOIN customers c ON o.customer_id = c.id
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, c.email, c.first_name, c.last_name, o.order_date, o.status, o.total_amount;

-- Create a test schema with additional tables
CREATE SCHEMA IF NOT EXISTS test_schema;

-- Create a simple table in test schema
CREATE TABLE test_schema.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data into test schema
INSERT INTO test_schema.users (username, email) VALUES
('testuser1', 'test1@example.com'),
('testuser2', 'test2@example.com'),
('testuser3', 'test3@example.com');