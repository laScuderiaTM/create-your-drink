-- Date de EXEMPLU ca să se poată testa wizard-ul. Prețurile sunt orientative;
-- Alexandra le modifică din /admin. Rulează după 0001_init.sql.

do $$
declare
  c_fara uuid; c_alc uuid; c_prem uuid;
  s uuid;
begin
  insert into categories (name_ro, name_en, description_ro, description_en, base_price, sort_order)
  values ('Fără alcool', 'Non-alcoholic', 'Limonadă sau mocktail creat de tine', 'Your own lemonade or mocktail', 10, 1)
  returning id into c_fara;
  insert into categories (name_ro, name_en, description_ro, description_en, base_price, sort_order)
  values ('Cu alcool', 'With alcohol', 'Cocktail cu alcool standard', 'Cocktail with standard spirits', 15, 2)
  returning id into c_alc;
  insert into categories (name_ro, name_en, description_ro, description_en, base_price, sort_order)
  values ('Premium', 'Premium', 'Cocktail cu alcool premium', 'Cocktail with premium spirits', 25, 3)
  returning id into c_prem;

  -- Fără alcool
  insert into steps (category_id, name_ro, name_en, min_select, max_select, sort_order)
  values (c_fara, 'Suc / bază', 'Juice / base', 1, 2, 1) returning id into s;
  insert into options (step_id, name_ro, name_en, price, sort_order) values
    (s, 'Suc de portocale', 'Orange juice', 6, 1),
    (s, 'Suc de ananas', 'Pineapple juice', 6, 2),
    (s, 'Apă tonică', 'Tonic water', 5, 3),
    (s, 'Apă minerală', 'Sparkling water', 3, 4);
  insert into steps (category_id, name_ro, name_en, min_select, max_select, sort_order)
  values (c_fara, 'Piure de fructe', 'Fruit purée', 0, 2, 2) returning id into s;
  insert into options (step_id, name_ro, name_en, price, sort_order) values
    (s, 'Căpșuni', 'Strawberry', 5, 1), (s, 'Mango', 'Mango', 5, 2), (s, 'Fructul pasiunii', 'Passion fruit', 6, 3);
  insert into steps (category_id, name_ro, name_en, min_select, max_select, sort_order)
  values (c_fara, 'Sirop', 'Syrup', 0, 2, 3) returning id into s;
  insert into options (step_id, name_ro, name_en, price, sort_order) values
    (s, 'Vanilie', 'Vanilla', 3, 1), (s, 'Caramel', 'Caramel', 3, 2), (s, 'Soc', 'Elderflower', 3, 3);
  insert into steps (category_id, name_ro, name_en, min_select, max_select, sort_order)
  values (c_fara, 'Extra', 'Extras', 0, 3, 4) returning id into s;
  insert into options (step_id, name_ro, name_en, price, sort_order) values
    (s, 'Mentă', 'Mint', 2, 1), (s, 'Lămâie', 'Lemon', 2, 2), (s, 'Lime', 'Lime', 2, 3);

  -- Cu alcool
  insert into steps (category_id, name_ro, name_en, hint_ro, hint_en, min_select, max_select, is_alcohol, sort_order)
  values (c_alc, 'Alcool', 'Spirit', 'Maxim 2 shot-uri', 'Max 2 shots', 1, 2, true, 1) returning id into s;
  insert into options (step_id, name_ro, name_en, price, max_qty, sort_order) values
    (s, 'Vodka', 'Vodka', 10, 2, 1), (s, 'Gin', 'Gin', 12, 2, 2),
    (s, 'Rom alb', 'White rum', 10, 2, 3), (s, 'Tequila', 'Tequila', 12, 2, 4);
  insert into steps (category_id, name_ro, name_en, min_select, max_select, sort_order)
  values (c_alc, 'Suc / bază', 'Juice / base', 1, 2, 2) returning id into s;
  insert into options (step_id, name_ro, name_en, price, sort_order) values
    (s, 'Suc de portocale', 'Orange juice', 6, 1), (s, 'Suc de ananas', 'Pineapple juice', 6, 2),
    (s, 'Apă tonică', 'Tonic water', 5, 3), (s, 'Cola', 'Cola', 5, 4);
  insert into steps (category_id, name_ro, name_en, min_select, max_select, sort_order)
  values (c_alc, 'Piure / sirop', 'Purée / syrup', 0, 2, 3) returning id into s;
  insert into options (step_id, name_ro, name_en, price, sort_order) values
    (s, 'Piure căpșuni', 'Strawberry purée', 5, 1), (s, 'Piure mango', 'Mango purée', 5, 2),
    (s, 'Sirop vanilie', 'Vanilla syrup', 3, 3);
  insert into steps (category_id, name_ro, name_en, min_select, max_select, sort_order)
  values (c_alc, 'Extra', 'Extras', 0, 3, 4) returning id into s;
  insert into options (step_id, name_ro, name_en, price, sort_order) values
    (s, 'Mentă', 'Mint', 2, 1), (s, 'Lămâie', 'Lemon', 2, 2), (s, 'Lime', 'Lime', 2, 3);

  -- Premium
  insert into steps (category_id, name_ro, name_en, hint_ro, hint_en, min_select, max_select, is_alcohol, sort_order)
  values (c_prem, 'Alcool premium', 'Premium spirit', 'Maxim 2 shot-uri', 'Max 2 shots', 1, 2, true, 1) returning id into s;
  insert into options (step_id, name_ro, name_en, price, max_qty, sort_order) values
    (s, 'Gin Hendrick''s', 'Hendrick''s Gin', 18, 2, 1), (s, 'Vodka Grey Goose', 'Grey Goose Vodka', 18, 2, 2),
    (s, 'Rom Diplomático', 'Diplomático Rum', 20, 2, 3);
  insert into steps (category_id, name_ro, name_en, min_select, max_select, sort_order)
  values (c_prem, 'Suc / bază', 'Juice / base', 1, 2, 2) returning id into s;
  insert into options (step_id, name_ro, name_en, price, sort_order) values
    (s, 'Tonic premium', 'Premium tonic', 7, 1), (s, 'Suc de portocale', 'Orange juice', 6, 2),
    (s, 'Ginger beer', 'Ginger beer', 7, 3);
  insert into steps (category_id, name_ro, name_en, min_select, max_select, sort_order)
  values (c_prem, 'Extra', 'Extras', 0, 3, 3) returning id into s;
  insert into options (step_id, name_ro, name_en, price, sort_order) values
    (s, 'Mentă', 'Mint', 2, 1), (s, 'Castravete', 'Cucumber', 2, 2), (s, 'Rozmarin', 'Rosemary', 2, 3);
end $$;
