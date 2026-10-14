import { pickOne, type SeededRandom } from "./create-seeded-random";

const FAMILY_NAMES = [
  "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng",
  "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý",
];

const MIDDLE_NAMES_MALE = ["Văn", "Minh", "Quốc", "Đức", "Hữu", "Thanh", "Anh"];
const MIDDLE_NAMES_FEMALE = ["Thị", "Ngọc", "Thu", "Mỹ", "Kim", "Hồng", "Phương"];

const GIVEN_NAMES_MALE = [
  "Hùng", "Dũng", "Tuấn", "Long", "Nam", "Khoa", "Phúc", "Hải", "Sơn", "Bình",
  "Cường", "Thắng", "Quân", "Đạt", "Việt",
];
const GIVEN_NAMES_FEMALE = [
  "Lan", "Hương", "Linh", "Trang", "Mai", "Thảo", "Ngân", "Hà", "Yến", "Vy",
  "Nhung", "Phương", "Chi", "Hạnh", "Oanh",
];

/** A plausible full name; some come out as a short handle like "Hùng BĐS". */
export function makeVietnameseName(random: SeededRandom): string {
  const male = random() < 0.5;
  const given = pickOne(random, male ? GIVEN_NAMES_MALE : GIVEN_NAMES_FEMALE);

  if (random() < 0.2) {
    return `${given} ${pickOne(random, ["BĐS", "Land", "Home", "Nhà Đất"])}`;
  }

  const family = pickOne(random, FAMILY_NAMES);
  const middle = pickOne(random, male ? MIDDLE_NAMES_MALE : MIDDLE_NAMES_FEMALE);
  return `${family} ${middle} ${given}`;
}
