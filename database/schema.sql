-- Cheffify database schema
-- PostgreSQL 14+

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    default_servings INTEGER NOT NULL CHECK (default_servings > 0),
    servings_min INTEGER CHECK (servings_min IS NULL OR servings_min > 0),
    servings_max INTEGER CHECK (servings_max IS NULL OR servings_max > 0),
    image_url TEXT,
    source_type VARCHAR(32) NOT NULL DEFAULT 'custom' CHECK (source_type IN ('built_in', 'custom')),
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE recipe_keywords (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    keyword VARCHAR(100) NOT NULL,
    UNIQUE (recipe_id, keyword)
);

CREATE TABLE recipe_tools (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    UNIQUE (recipe_id, name)
);

CREATE TABLE recipe_ingredients (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    display_name VARCHAR(255) NOT NULL,
    normalized_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(10,3) NOT NULL DEFAULT 0,
    unit VARCHAR(50),
    is_optional BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    UNIQUE (recipe_id, normalized_name, unit, sort_order)
);

CREATE TABLE recipe_instructions (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    instruction TEXT NOT NULL,
    UNIQUE (recipe_id, step_number)
);

CREATE TABLE recipe_nutrition (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER NOT NULL UNIQUE REFERENCES recipes(id) ON DELETE CASCADE,
    calories NUMERIC(8,2),
    protein_g NUMERIC(8,2),
    carbs_g NUMERIC(8,2),
    fat_g NUMERIC(8,2),
    fiber_g NUMERIC(8,2),
    notes TEXT
);

CREATE TABLE meal_plans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE meal_plan_recipes (
    id SERIAL PRIMARY KEY,
    meal_plan_id INTEGER NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE RESTRICT,
    servings INTEGER NOT NULL CHECK (servings > 0),
    meal_type VARCHAR(50),
    notes TEXT,
    UNIQUE (meal_plan_id, recipe_id)
);

CREATE TABLE grocery_lists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'Groceries',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE grocery_list_items (
    id SERIAL PRIMARY KEY,
    grocery_list_id INTEGER NOT NULL REFERENCES grocery_lists(id) ON DELETE CASCADE,
    display_name VARCHAR(255) NOT NULL,
    normalized_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(10,3) NOT NULL DEFAULT 0,
    unit VARCHAR(50),
    checked_off BOOLEAN NOT NULL DEFAULT FALSE,
    source_type VARCHAR(32) NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'recipe_generated')),
    source_recipe_id INTEGER REFERENCES recipes(id) ON DELETE SET NULL,
    source_recipe_name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE grocery_item_sources (
    id SERIAL PRIMARY KEY,
    grocery_list_item_id INTEGER NOT NULL REFERENCES grocery_list_items(id) ON DELETE CASCADE,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    recipe_title VARCHAR(255) NOT NULL,
    quantity NUMERIC(10,3) NOT NULL,
    unit VARCHAR(50),
    UNIQUE (grocery_list_item_id, recipe_id)
);

CREATE INDEX idx_recipes_title ON recipes (title);
CREATE INDEX idx_recipe_ingredients_normalized ON recipe_ingredients (normalized_name);
CREATE INDEX idx_recipe_keywords_keyword ON recipe_keywords (keyword);
CREATE INDEX idx_meal_plan_recipes_recipe_id ON meal_plan_recipes (recipe_id);
CREATE INDEX idx_grocery_list_items_normalized ON grocery_list_items (normalized_name);
CREATE INDEX idx_grocery_item_sources_recipe_id ON grocery_item_sources (recipe_id);

-- Optional convenience trigger for updated_at if you want to add later.
-- This file intentionally keeps the schema straightforward for first implementation.
