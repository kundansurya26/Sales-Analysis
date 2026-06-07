#!/usr/bin/env python3
"""
Seed script: generates and inserts realistic sample data.
Run: python seed.py
"""
import asyncio
import random
from datetime import date, timedelta

from faker import Faker
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import get_password_hash
from app.db.session import AsyncSessionLocal, engine, Base
from app.models.models import Customer, CustomerSegment, Employee, Product, Sale, User, UserRole

fake = Faker()
random.seed(42)
Faker.seed(42)

# ── Product data ──────────────────────────────────────────────────────────────

CATEGORIES = {
    "Electronics":    [("Laptop Pro 15", 1299, 780), ("Wireless Headphones", 199, 89),
                       ("Smart Watch Series 5", 349, 145), ("4K Monitor 27\"", 449, 210),
                       ("Mechanical Keyboard", 129, 55), ("Gaming Mouse", 79, 32),
                       ("USB-C Hub 7-in-1", 59, 22), ("Portable SSD 1TB", 109, 48),
                       ("Webcam 4K", 149, 65), ("Bluetooth Speaker", 89, 38)],
    "Software":       [("CRM Enterprise License", 2999, 200), ("Analytics Suite Pro", 1499, 150),
                       ("Security Scanner", 799, 80), ("Backup Cloud 1TB/yr", 299, 30),
                       ("Project Manager Pro", 199, 20), ("Password Manager Team", 149, 15),
                       ("VPN Business Plan", 249, 25), ("Email Marketing Tool", 399, 40),
                       ("HR Management Suite", 999, 100), ("Accounting Software", 599, 60)],
    "Office Supplies": [("Ergonomic Chair Pro", 599, 280), ("Standing Desk 60\"", 799, 360),
                        ("Whiteboard 48\"x36\"", 189, 85), ("Shredder X200", 149, 62),
                        ("Label Printer", 129, 55), ("Binding Machine", 89, 38),
                        ("Desk Organizer Set", 49, 18), ("Monitor Arm Dual", 99, 42),
                        ("Wireless Charger Pad", 39, 14), ("Laptop Stand Aluminum", 59, 24)],
    "Networking":     [("Managed Switch 24-port", 699, 320), ("Wi-Fi 6 Router", 299, 128),
                       ("Firewall Appliance", 1499, 650), ("PoE Injector 48V", 89, 35),
                       ("Network Rack 12U", 399, 175), ("Patch Panel 24-port", 149, 60),
                       ("UPS 1500VA", 299, 130), ("Cable Management Kit", 49, 18),
                       ("SFP+ Transceiver", 89, 35), ("IP KVM Switch", 599, 265)],
    "Services":       [("Consulting Day Rate", 1500, 450), ("Training Workshop", 2500, 800),
                       ("Managed IT Monthly", 999, 300), ("Data Migration Project", 4999, 1500),
                       ("Security Audit", 3499, 1050), ("Cloud Setup Package", 2999, 900),
                       ("24/7 Support Plan", 799, 240), ("Custom Development 10h", 3000, 900),
                       ("API Integration Setup", 1999, 600), ("Performance Optimization", 2499, 750)],
}

REGIONS = ["North America", "Europe", "Asia Pacific", "Latin America"]
SEGMENTS = [CustomerSegment.GOLD, CustomerSegment.SILVER, CustomerSegment.BRONZE]
DEPARTMENTS = ["Sales", "Engineering", "Marketing", "Support", "Operations"]
ROLES_BY_DEPT = {
    "Sales":       ["VP Sales", "Account Executive", "Sales Rep", "Sales Analyst"],
    "Engineering": ["CTO", "Senior Engineer", "Engineer", "QA Engineer"],
    "Marketing":   ["CMO", "Marketing Manager", "Content Writer", "SEO Specialist"],
    "Support":     ["Support Manager", "Support Agent", "Technical Support"],
    "Operations":  ["COO", "Operations Manager", "Logistics Coordinator"],
}


async def seed(db: AsyncSession) -> None:
    print("🌱 Seeding database...")

    # ── Admin user ────────────────────────────────────────────────────────────
    admin = User(
        email=settings.ADMIN_EMAIL,
        full_name="Admin User",
        hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
        role=UserRole.ADMIN,
    )
    viewer = User(
        email="viewer@example.com",
        full_name="View Only",
        hashed_password=get_password_hash("Viewer123!"),
        role=UserRole.VIEWER,
    )
    db.add_all([admin, viewer])
    await db.flush()
    print("  ✅ Users created")

    # ── Products ──────────────────────────────────────────────────────────────
    products: list[Product] = []
    for category, items in CATEGORIES.items():
        for name, price, cost in items:
            p = Product(
                name=name,
                category=category,
                unit_price=price,
                cost_price=cost,
                description=fake.sentence(nb_words=10),
            )
            db.add(p)
            products.append(p)
    await db.flush()
    print(f"  ✅ {len(products)} products created")

    # ── Employees ─────────────────────────────────────────────────────────────
    managers: dict[str, Employee] = {}
    employees: list[Employee] = []

    for dept in DEPARTMENTS:
        roles = ROLES_BY_DEPT[dept]
        # First role = manager
        mgr = Employee(
            name=fake.name(),
            role=roles[0],
            department=dept,
            hire_date=fake.date_between(start_date="-8y", end_date="-3y"),
            salary=round(random.uniform(90000, 150000), 2),
        )
        db.add(mgr)
        employees.append(mgr)
        managers[dept] = mgr

    await db.flush()  # Get IDs for manager references

    for dept in DEPARTMENTS:
        roles = ROLES_BY_DEPT[dept]
        mgr = managers[dept]
        for role in roles[1:]:
            emp = Employee(
                name=fake.name(),
                role=role,
                department=dept,
                hire_date=fake.date_between(start_date="-5y", end_date="-6m"),
                salary=round(random.uniform(50000, 90000), 2),
                manager_id=mgr.id,
            )
            db.add(emp)
            employees.append(emp)

    await db.flush()
    print(f"  ✅ {len(employees)} employees created")

    # ── Customers ─────────────────────────────────────────────────────────────
    customers: list[Customer] = []
    # Weighted segments: 20% Gold, 35% Silver, 45% Bronze
    seg_weights = [CustomerSegment.GOLD] * 20 + [CustomerSegment.SILVER] * 35 + [CustomerSegment.BRONZE] * 45

    for i in range(100):
        c = Customer(
            name=fake.company() if random.random() < 0.4 else fake.name(),
            email=fake.unique.email(),
            region=random.choice(REGIONS),
            customer_segment=random.choice(seg_weights),
            join_date=fake.date_between(start_date="-4y", end_date="-3m"),
            phone=fake.phone_number()[:20],
        )
        db.add(c)
        customers.append(c)

    await db.flush()
    print(f"  ✅ {len(customers)} customers created")

    # ── Sales ─────────────────────────────────────────────────────────────────
    # Gold customers buy more frequently and in larger quantities
    segment_multiplier = {
        CustomerSegment.GOLD: 3,
        CustomerSegment.SILVER: 2,
        CustomerSegment.BRONZE: 1,
    }
    start = date(2023, 1, 1)
    end = date(2024, 12, 31)

    sales_count = 0
    for customer in customers:
        multiplier = segment_multiplier[customer.customer_segment]
        n_sales = random.randint(5, 15) * multiplier

        for _ in range(n_sales):
            product = random.choice(products)
            sale_date = fake.date_between(start_date=start, end_date=end)

            # Higher-priced items → lower quantity; cheaper items → higher quantity
            max_qty = max(1, int(500 / max(float(product.unit_price), 1)))
            quantity = random.randint(1, min(max_qty, 20))

            # Gold customers get better discounts
            if customer.customer_segment == CustomerSegment.GOLD:
                discount = round(random.choice([0, 5, 10, 15, 20]), 1)
            elif customer.customer_segment == CustomerSegment.SILVER:
                discount = round(random.choice([0, 0, 5, 10]), 1)
            else:
                discount = round(random.choice([0, 0, 0, 5]), 1)

            sale = Sale(
                product_id=product.id,
                customer_id=customer.id,
                quantity=quantity,
                sale_date=sale_date,
                discount_percent=discount,
                unit_price_at_sale=product.unit_price,
                cost_price_at_sale=product.cost_price,
            )
            db.add(sale)
            sales_count += 1

    await db.flush()
    print(f"  ✅ ~{sales_count} sales records created")
    print("✨ Database seeded successfully!")


async def main():
    # Re-create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        try:
            await seed(db)
            await db.commit()
        except Exception as e:
            await db.rollback()
            print(f"❌ Seeding failed: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(main())
