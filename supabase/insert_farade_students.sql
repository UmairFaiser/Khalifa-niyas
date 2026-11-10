-- One-off data load: 32 Farade students.
-- Run this in the Supabase SQL editor (or psql) whenever you are ready.
--
-- index_number is filled in automatically by the set_index_number trigger
-- (institute 'farade' -> fr_seq -> FR0001, FR0002, ...), so it is deliberately
-- not part of the column list below. Duplicate phone numbers are allowed.
--
-- Note: 'Zuha' has a 12-digit number that is not a Sri Lankan 07 mobile.
-- It will insert fine here (no phone constraint on the table), but
-- public.update_student_details() enforces ^07[0-9]{8}$, so that record
-- cannot be updated from the /details page later.

insert into public.students (name, phone_number, institute) values
  ('Amani Rafeek',       '0762767402',   'farade'),
  ('Aazima Aazir',       '0766403573',   'farade'),
  ('Hamna Haroos',       '0760236166',   'farade'),
  ('Zainab',             '0787084539',   'farade'),
  ('Maimoona Rizvi',     '0766175864',   'farade'),
  ('Izra Ismudeen',      '0714910857',   'farade'),
  ('Shabeeha',           '0766696776',   'farade'),
  ('Zuha',               '966545413032', 'farade'),
  ('Saara',              '0767423376',   'farade'),
  ('Nushrath Hamdha',    '0741876736',   'farade'),
  ('Ruqaiya Shakeer',    '0741434415',   'farade'),
  ('Zikra Irshad',       '0726802275',   'farade'),
  ('Habza',              '0762119353',   'farade'),
  ('Samra',              '0788466172',   'farade'),
  ('Zainab',             '0754781488',   'farade'),
  ('Rushdha',            '0776450480',   'farade'),
  ('Razna',              '0763527266',   'farade'),
  ('Safiyyah Fazil',     '0751172188',   'farade'),
  ('Lamha Naushard',     '0771833305',   'farade'),
  ('Shaima Shinazi',     '0751305475',   'farade'),
  ('Leena Imthaz',       '0771542004',   'farade'),
  ('Zainab Razlan',      '0763528502',   'farade'),
  ('Haidha Yazeer',      '0777201082',   'farade'),
  ('Maryam Mushthaque',  '0775654466',   'farade'),
  ('Reema Razeen',       '0789854094',   'farade'),
  ('Reeha Isthihar',     '0764844960',   'farade'),
  ('A.W.F Shamra',       '0717710057',   'farade'),
  ('Amna Fahim',         '0772525899',   'farade'),
  ('Methuni Rathnayake', '0707163711',   'farade'),
  ('Rizikeshan',         '0776271452',   'farade'),
  ('Faizul Ahamed',      '0765546195',   'farade'),
  ('Shimak Rizwan',      '0771144401',   'farade')
returning index_number, name;
