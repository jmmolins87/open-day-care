-- Seed: insert test children with room assignments
-- Reference: rooms created in SPEC 10 (sol, estrella, arcoiris)
-- Daycare: "Guardería Sala Soles" (058bf735-8e5c-4dd2-ac94-802938e525ef)

-- Children with room "sol"
INSERT INTO public.children (id, room_id, full_name, birth_date, enrolled_at, medical_notes, allergy_tags, photo_consent, status, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'f7712b61-c2b6-4e24-aaef-2c72bd8b7367'::uuid, 'Mateo Fernández', '2022-03-12', '2025-02-01', 'Alergia al maní', '{{peanut}}', true, 'active', now(), now()),
  (gen_random_uuid(), 'f7712b61-c2b6-4e24-aaef-2c72bd8b7367'::uuid, 'Sofía Méndez', '2023-08-05', '2025-03-01', NULL, '{{}}', true, 'active', now(), now()),
  (gen_random_uuid(), 'f7712b61-c2b6-4e24-aaef-2c72bd8b7367'::uuid, 'Benjamín Ruiz', '2022-01-21', '2025-01-15', NULL, '{{gluten}}', true, 'active', now(), now()),
  (gen_random_uuid(), 'f7712b61-c2b6-4e24-aaef-2c72bd8b7367'::uuid, 'Valentina Soto', '2023-11-14', '2025-04-01', 'Alergia a huevo', '{{egg}}', true, 'active', now(), now()),
  (gen_random_uuid(), 'f7712b61-c2b6-4e24-aaef-2c72bd8b7367'::uuid, 'Tomás Díaz', '2022-06-02', '2025-02-15', NULL, '{{lactose}}', true, 'active', now(), now());

-- Children with room "estrella"
INSERT INTO public.children (id, room_id, full_name, birth_date, enrolled_at, medical_notes, allergy_tags, photo_consent, status, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'f1698036-a208-48ab-a6b9-9de7f99dcd04'::uuid, 'Emma Castro', '2023-04-30', '2025-05-01', NULL, '{{peanut, tree-nuts}}', true, 'active', now(), now()),
  (gen_random_uuid(), 'f1698036-a208-48ab-a6b9-9de7f99dcd04'::uuid, 'Lucas Romero', '2022-09-18', '2025-01-20', 'Asma bronquial', '{{}}', true, 'active', now(), now()),
  (gen_random_uuid(), 'f1698036-a208-48ab-a6b9-9de7f99dcd04'::uuid, 'Olivia Vega', '2023-07-07', '2025-06-01', NULL, '{{tree-nuts}}', true, 'active', now(), now());

-- Children with room "arcoiris"
INSERT INTO public.children (id, room_id, full_name, birth_date, enrolled_at, medical_notes, allergy_tags, photo_consent, status, created_at, updated_at)
VALUES 
  (gen_random_uuid(), '8417639a-d1aa-4398-a44e-a722165f970b'::uuid, 'Lucas', '2022-05-10', '2025-03-01', NULL, '{{}}', true, 'active', now(), now()),
  (gen_random_uuid(), '8417639a-d1aa-4398-a44e-a722165f970b'::uuid, 'Santiago', '2023-02-15', '2025-07-01', 'Alergia a maní y lactosa', '{{peanut, lactose}}', true, 'active', now(), now()),
  (gen_random_uuid(), '8417639a-d1aa-4398-a44e-a722165f970b'::uuid, 'Daniela', '2022-12-01', '2025-08-01', NULL, '{{gluten}}', true, 'active', now(), now());