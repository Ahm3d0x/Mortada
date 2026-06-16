-- =====================================================
-- Seed Mock Data (30 Players per Package)
-- Run this in the Supabase SQL Editor to populate test packages
-- =====================================================

DO $$
DECLARE
  pkg_egypt_id UUID := gen_random_uuid();
  pkg_legends_id UUID := gen_random_uuid();
  pkg_tactical_id UUID := gen_random_uuid();

  -- Egypt Players Names (30 names)
  egypt_names text[] := ARRAY[
    'M. El Shenawy', 'Ahmed Hegazi', 'Mohamed Salah', 'Mohamed Elneny', 'Trezeguet', 
    'Mostafa Mohamed', 'Omar Marmoush', 'Ahmed Sayed Zizo', 'Mohamed Magdy Afsha', 'Hamdi Fathi', 
    'Emam Ashour', 'Marwan Attia', 'Mohamed Abdelmonem', 'Yasser Ibrahim', 'Mohamed Hany', 
    'Omar Kamal', 'Ahmed Fatouh', 'M. Abou Gabal', 'Mostafa Shobeir', 'Ramy Rabia', 
    'Mohamed Sherif', 'Mahmoud Kahraba', 'Ahmed Hassan Koka', 'Mahmoud Shikabala', 'Abdallah Said', 
    'Tarek Hamed', 'Amr Elsolia', 'Ramadan Sobhi', 'Mostafa Fathi', 'Mohamed Ibrahim'
  ];

  -- World Legends Names (30 names)
  legend_names text[] := ARRAY[
    'Cristiano Ronaldo', 'Lionel Messi', 'Zinedine Zidane', 'Paolo Maldini', 'Gianluigi Buffon', 
    'Ronaldinho', 'Pele', 'Diego Maradona', 'Johan Cruyff', 'Ronaldo Nazario', 
    'Thierry Henry', 'David Beckham', 'Andrea Pirlo', 'Xavi Hernandez', 'Andres Iniesta', 
    'Steven Gerrard', 'Frank Lampard', 'Roberto Carlos', 'Carles Puyol', 'Alessandro Nesta', 
    'Fabio Cannavaro', 'Iker Casillas', 'Oliver Kahn', 'Zlatan Ibrahimovic', 'Wayne Rooney', 
    'Luis Figo', 'Kaka', 'Luka Modric', 'Karim Benzema', 'Neymar Jr'
  ];

  -- Loop variables
  i integer;
  card_id UUID;
  c_name text;
  c_role text;
  c_role_ar text;
  c_att integer;
  c_def integer;
  c_legend boolean;
  c_avatar text;
  c_team text;
BEGIN
  -- Insert Packages
  INSERT INTO packages (id, name, description, image, type, legend_percentage) VALUES
  (pkg_egypt_id, 'منتخب مصر الفراعنة 🇪🇬', 'تشكيلة المنتخب المصري التكتيكية كاملة بـ 30 لاعباً.', '🇪🇬', 'player', 40),
  (pkg_legends_id, 'أساطير العالم 🌍', 'باقة صفوة وأعظم 30 لاعباً أسطورياً في تاريخ كرة القدم.', '👑', 'player', 100),
  (pkg_tactical_id, 'التكتيكات الحاسمة 🃏', 'مجموعة الكروت الخاصة والخطط التكتيكية لإرباك الخصم.', '⚡', 'special', 30);

  -- ─── Egypt Players Generation (30 players) ───────────
  FOR i IN 1..30 LOOP
    c_name := egypt_names[i];
    c_team := 'مصر';
    
    -- Assign roles and stats based on index
    IF i IN (1, 18, 19) THEN
      c_role := 'goalkeeper';
      c_role_ar := 'حارس مرمى';
      c_att := floor(random() * 3) + 1; -- 1..3
      c_def := floor(random() * 4) + 11; -- 11..14
      c_avatar := '🧤';
    ELSIF i IN (2, 13, 14, 15, 16, 17, 20) THEN
      c_role := 'defender';
      c_role_ar := 'مدافع صلب';
      c_att := floor(random() * 4) + 2; -- 2..5
      c_def := floor(random() * 5) + 10; -- 10..14
      c_avatar := '🛡️';
    ELSIF i IN (4, 9, 10, 11, 12, 25, 26, 27) THEN
      c_role := 'midfielder';
      c_role_ar := 'لاعب وسط';
      c_att := floor(random() * 5) + 6; -- 6..10
      c_def := floor(random() * 5) + 7; -- 7..11
      c_avatar := '🏃';
    ELSE
      c_role := 'attacker';
      c_role_ar := 'مهاجم سريع';
      c_att := floor(random() * 5) + 10; -- 10..14
      c_def := floor(random() * 4) + 3; -- 3..6
      c_avatar := '⚡';
    END IF;

    -- Make some players legends
    IF i IN (3, 5, 8, 11, 24, 25) THEN
      c_legend := true;
      c_att := 15;
      c_avatar := '👑';
      c_role_ar := 'أسطورة ' || c_role_ar;
    ELSE
      c_legend := false;
    END IF;

    card_id := gen_random_uuid();
    
    INSERT INTO cards (id, name, attack, defense, role, role_arabic, is_legend, description, team, avatar) VALUES
    (card_id, c_name, c_att, c_def, c_role, c_role_ar, c_legend, 'لاعب مخصص لمنتخب مصر الفراعنة.', c_team, c_avatar);

    INSERT INTO package_cards (package_id, card_id) VALUES
    (pkg_egypt_id, card_id);
  END LOOP;

  -- ─── World Legends Generation (30 players) ──────────
  FOR i IN 1..30 LOOP
    c_name := legend_names[i];
    c_legend := true; -- All are legends
    c_avatar := '👑';
    
    -- Assign roles and stats based on index
    IF i IN (5, 22, 23) THEN
      c_role := 'goalkeeper';
      c_role_ar := 'أسطورة حراسة المرمى';
      c_att := 1;
      c_def := 15;
    ELSIF i IN (4, 18, 19, 20, 21) THEN
      c_role := 'defender';
      c_role_ar := 'أسطورة دفاعية صلبة';
      c_att := floor(random() * 3) + 3; -- 3..5
      c_def := 15;
    ELSIF i IN (3, 13, 14, 15, 16, 17, 27, 28) THEN
      c_role := 'midfielder';
      c_role_ar := 'مايسترو خط الوسط';
      c_att := floor(random() * 3) + 12; -- 12..14
      c_def := floor(random() * 3) + 9; -- 9..11
    ELSE
      c_role := 'attacker';
      c_role_ar := 'مهاجم أسطوري خارق';
      c_att := 15;
      c_def := floor(random() * 3) + 3; -- 3..5
    END IF;

    card_id := gen_random_uuid();
    
    INSERT INTO cards (id, name, attack, defense, role, role_arabic, is_legend, description, team, avatar) VALUES
    (card_id, c_name, c_att, c_def, c_role, c_role_ar, c_legend, 'من أعظم لاعبي كرة القدم في التاريخ.', 'أساطير', c_avatar);

    INSERT INTO package_cards (package_id, card_id) VALUES
    (pkg_legends_id, card_id);
  END LOOP;

  -- ─── Tactical Cards (Special) ────────────────────────
  DECLARE
    spec_red_card_id UUID := gen_random_uuid();
    spec_offside_id UUID := gen_random_uuid();
    spec_counter_id UUID := gen_random_uuid();
    spec_bus_id UUID := gen_random_uuid();
    spec_fans_id UUID := gen_random_uuid();
    spec_wet_id UUID := gen_random_uuid();
  BEGIN
    INSERT INTO special_cards (id, name, effect, effect_arabic, description, icon) VALUES
    (spec_red_card_id, 'بطاقة حمراء 🟥', 'red_card', 'بطاقة حمراء طرد', 'طرد لاعب من تشكيلة الخصم فوراً لتقليل قوته.', '🟥'),
    (spec_offside_id, 'مصيدة التسلل 🚩', 'offside', 'مصيدة تسلل دفاعية', 'تفعيل مصيدة التسلل لقطع هجمة الخصم المندفعة.', '🚩'),
    (spec_counter_id, 'المرتدة السريعة ⚡', 'counter_attack', 'مرتدة خاطفة هجومية', 'شن هجوم مرتد سريع ومفاجئ يربك دفاعات الخصم.', '⚡'),
    (spec_bus_id, 'ركن الحافلة 🚌', 'park_the_bus', 'تأمين دفاعي مكثف', 'التراجع الكامل للدفاع وتأمين المرمى لمنع استقبال أهداف.', '🚌'),
    (spec_fans_id, 'هتاف الجماهير 🗣️', 'fans', 'حماس جماهيري كبير', 'حماس الجماهير يزيد طاقة هجومك ودفاعك لدور كامل.', '🗣️'),
    (spec_wet_id, 'أرضية رطبة 🌧️', 'wet_pitch', 'تأثير المطر على الملعب', 'الطقس الماطر يقلل سرعة ودفاع كلا الفريقين لدورين.', '🌧️');

    INSERT INTO package_special_cards (package_id, special_card_id) VALUES
    (pkg_tactical_id, spec_red_card_id),
    (pkg_tactical_id, spec_offside_id),
    (pkg_tactical_id, spec_counter_id),
    (pkg_tactical_id, spec_bus_id),
    (pkg_tactical_id, spec_fans_id),
    (pkg_tactical_id, spec_wet_id);
  END;

END $$;
