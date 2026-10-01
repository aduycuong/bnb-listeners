/**
 * Demo case for the project listening dashboard.
 * Replace `getListeningDemo` with live queries later; keep the `ListeningDemo` shape.
 */

export const LISTENING_PERIODS = ["7d", "30d", "90d"] as const;

export type ListeningPeriod = (typeof LISTENING_PERIODS)[number];

export const LISTENING_PERIOD_LABELS: Record<ListeningPeriod, string> = {
  "7d": "7 ngày",
  "30d": "30 ngày",
  "90d": "90 ngày",
};

export type SentimentKey = "negative" | "neutral" | "positive";

export type VolumePoint = {
  date: string;
  label: string;
  negative: number;
  neutral: number;
  positive: number;
  competitors: number;
};

export type ListeningInsight = {
  tone: "alert" | "idea" | "good";
  text: string;
};

export type ListeningPrompt = {
  label: string;
  keywords: string[];
  answer: string;
};

export type ListeningTopic = {
  name: string;
  mentions: number;
  deltaPercent: number;
  negative: number;
  neutral: number;
  positive: number;
};

export type ListeningPhrase = {
  text: string;
  mentions: number;
  deltaPercent: number;
};

export type ListeningMention = {
  source: string;
  author: string;
  publishedLabel: string;
  title: string;
  excerpt: string;
  sentiment: SentimentKey;
  engagement: number;
  reach: number;
  topics: string[];
};

export type ListeningVoice = {
  name: string;
  role: string;
  reach: number;
  sentiment: SentimentKey;
  quote: string;
};

export type AudienceGroup = {
  name: string;
  share: number;
  negative: number;
  neutral: number;
  positive: number;
};

export type EmotionSlice = {
  label: string;
  share: number;
  color: string;
};

export type NamedCount = {
  name: string;
  value: number;
};

export type ListeningDemo = {
  period: ListeningPeriod;
  rangeLabel: string;
  comparisonLabel: string;
  brief: string;
  insights: ListeningInsight[];
  prompts: ListeningPrompt[];
  volume: VolumePoint[];
  peak: { label: string; total: number; cause: string };
  mentions: { value: number; deltaPercent: number };
  negativeShare: { value: number; deltaPoints: number };
  reach: { value: number; deltaPercent: number };
  engagement: { value: number; deltaPercent: number };
  authors: number;
  netSentiment: { value: number; deltaPoints: number };
  sentiment: Record<SentimentKey, number>;
  emotions: EmotionSlice[];
  topics: ListeningTopic[];
  phrases: ListeningPhrase[];
  audience: AudienceGroup[];
  voices: ListeningVoice[];
  channels: NamedCount[];
  places: NamedCount[];
  highlights: ListeningMention[];
};

const SERIES_END = new Date(Date.UTC(2026, 9, 1));

const PERIOD_DAYS: Record<ListeningPeriod, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const CHANNEL_WEIGHTS = [
  ["Facebook", 0.62],
  ["TikTok", 0.14],
  ["Báo", 0.12],
  ["Diễn đàn", 0.07],
  ["Web", 0.05],
] as const;

const PLACE_WEIGHTS = [
  ["Đà Lạt", 0.28],
  ["TP. Hồ Chí Minh", 0.22],
  ["Hà Nội", 0.16],
  ["Hội An", 0.11],
  ["Đà Nẵng", 0.09],
  ["Khác", 0.14],
] as const;

const EMOTION_COLOR = {
  anger: "oklch(0.62 0.17 25)",
  worry: "oklch(0.74 0.12 75)",
  account: "oklch(0.62 0.03 250)",
  praise: "oklch(0.62 0.13 155)",
} as const;

const PERIOD_STORY: Record<
  ListeningPeriod,
  {
    reach: { value: number; deltaPercent: number };
    engagement: { value: number; deltaPercent: number };
    authors: number;
    insights: ListeningInsight[];
    prompts: ListeningPrompt[];
    emotions: { label: string; share: number; color: string }[];
    topics: ListeningTopic[];
    phrases: ListeningPhrase[];
    audience: AudienceGroup[];
    voices: ListeningVoice[];
    highlights: ListeningMention[];
  }
> = {
  "7d": {
    reach: { value: 380_000, deltaPercent: -9 },
    engagement: { value: 14_200, deltaPercent: -11 },
    authors: 310,
    insights: [
      {
        tone: "good",
        text: "Thảo luận giảm hơn một nửa so với tuần đỉnh và đã về sát mặt bằng đối thủ. Có thể coi đợt khủng hoảng đã qua, chưa coi chủ nhà đã yên.",
      },
      {
        tone: "alert",
        text: "Phí vệ sinh tăng 18% ngay trong tuần hạ nhiệt. Khi báo cáo, tách phụ phí khỏi hủy phòng để không kết luận nhầm là mọi thứ đã dịu.",
      },
      {
        tone: "idea",
        text: "Cụm “mất Superhost” tăng 64%. Nên theo dõi như một chủ đề riêng trước khi gộp vào Superhost.",
      },
    ],
    prompts: [
      {
        label: "Vì sao tuần này hạ?",
        keywords: ["hạ", "giảm", "tuần"],
        answer:
          "Đỉnh hủy phòng nằm ở tuần 18–21/9. Tuần này không còn đợt đó, nên thảo luận về gần mức đối thủ. Phần còn nóng là phí vệ sinh và mất Superhost.",
      },
      {
        label: "Việc gì nên làm?",
        keywords: ["làm", "nên", "báo cáo"],
        answer:
          "Tách phí vệ sinh và mất Superhost thành hai mục riêng. Đừng viết báo cáo tuần này như thể đợt hủy vẫn đang đỉnh.",
      },
    ],
    emotions: [
      { label: "Bức xúc", share: 0.26, color: EMOTION_COLOR.anger },
      { label: "Lo lắng", share: 0.24, color: EMOTION_COLOR.worry },
      { label: "Kể việc", share: 0.3, color: EMOTION_COLOR.account },
      { label: "Hài lòng", share: 0.2, color: EMOTION_COLOR.praise },
    ],
    topics: [
      { name: "Khách hủy phòng", mentions: 96, deltaPercent: -22, negative: 48, neutral: 30, positive: 18 },
      { name: "Phí vệ sinh", mentions: 64, deltaPercent: 18, negative: 38, neutral: 18, positive: 8 },
      { name: "Mất Superhost", mentions: 41, deltaPercent: 64, negative: 24, neutral: 11, positive: 6 },
      { name: "Giá phòng theo mùa", mentions: 52, deltaPercent: -8, negative: 14, neutral: 22, positive: 16 },
      { name: "Check-in linh hoạt", mentions: 38, deltaPercent: 4, negative: 4, neutral: 10, positive: 24 },
      { name: "Superhost", mentions: 44, deltaPercent: -3, negative: 8, neutral: 12, positive: 24 },
    ],
    phrases: [
      { text: "phí vệ sinh", mentions: 64, deltaPercent: 18 },
      { text: "mất Superhost", mentions: 41, deltaPercent: 64 },
      { text: "hủy sát giờ", mentions: 28, deltaPercent: -40 },
      { text: "gộp vào giá", mentions: 22, deltaPercent: 35 },
    ],
    audience: [
      { name: "Chủ nhà", share: 0.57, negative: 0.4, neutral: 0.36, positive: 0.24 },
      { name: "Khách", share: 0.26, negative: 0.16, neutral: 0.38, positive: 0.46 },
      { name: "Báo chí", share: 0.17, negative: 0.12, neutral: 0.72, positive: 0.16 },
    ],
    voices: [
      {
        name: "Trúc Ly",
        role: "Blog vận hành homestay",
        reach: 4100,
        sentiment: "neutral",
        quote: "Gộp phí vệ sinh vào giá thì bớt cãi, doanh thu gần như không đổi.",
      },
      {
        name: "Lan Anh",
        role: "Chủ nhà · 3 căn Đà Lạt",
        reach: 18200,
        sentiment: "negative",
        quote: "Tuần này đỡ hủy hơn, nhưng mình vẫn canh tỷ lệ Superhost mỗi sáng.",
      },
      {
        name: "Hà My",
        role: "Chủ nhà · Hội An",
        reach: 6400,
        sentiment: "positive",
        quote: "Check-in từ trưa vẫn là thứ giữ được khách tháng này.",
      },
    ],
    highlights: [
      {
        source: "Web",
        author: "Trúc Ly",
        publishedLabel: "28/9",
        title: "Có nên gộp phí vệ sinh vào giá phòng?",
        excerpt:
          "Một số host bỏ dòng phí riêng để giảm khiếu nại. Doanh thu không đổi nhiều, bình luận bớt cãi nhau về khoản phụ phí.",
        sentiment: "neutral",
        engagement: 96,
        reach: 4100,
        topics: ["Phí vệ sinh", "Giá phòng theo mùa"],
      },
      {
        source: "Facebook",
        author: "Lan Anh",
        publishedLabel: "18/9",
        title: "Mùa này khách hủy nhiều quá",
        excerpt:
          "Mình đang chạy 3 căn ở Đà Lạt. Mưa xuống là khách hủy liên tục, hạ 30% vẫn không giữ được lịch. Sợ mất Superhost vì tỷ lệ hủy.",
        sentiment: "negative",
        engagement: 1284,
        reach: 18200,
        topics: ["Khách hủy phòng", "Superhost"],
      },
      {
        source: "TikTok",
        author: "phongdalat.today",
        publishedLabel: "20/9",
        title: "Trống phòng giữa tuần mưa",
        excerpt:
          "Clip lịch tháng 9 bị gạch đỏ gần nửa. Phần bình luận toàn host hỏi nhau có nên khóa ngày lễ hay hạ giá tiếp.",
        sentiment: "negative",
        engagement: 6400,
        reach: 88000,
        topics: ["Mùa thấp điểm", "Homestay Đà Lạt"],
      },
      {
        source: "Facebook",
        author: "Hà My",
        publishedLabel: "12/9",
        title: "Check-in linh hoạt giữ được khách ở lại",
        excerpt:
          "Mình mở check-in từ 12h và gửi hướng dẫn trước một ngày. Tháng này hủy giảm, review nhắc đúng khoản này.",
        sentiment: "positive",
        engagement: 412,
        reach: 6400,
        topics: ["Check-in linh hoạt", "Superhost"],
      },
    ],
  },
  "30d": {
    reach: { value: 2_400_000, deltaPercent: 27 },
    engagement: { value: 86_400, deltaPercent: 22 },
    authors: 1240,
    insights: [
      {
        tone: "alert",
        text: "Đỉnh 19/9 là đợt khách hủy ở Đà Lạt và vượt rõ mặt bằng đối thủ. Đọc group host trước khi coi đây là chuyện cả nước.",
      },
      {
        tone: "alert",
        text: "Cụm “hủy sát giờ” tăng 86%. Nên theo dõi chính sách hủy như một chủ đề riêng, không gộp vào giá phòng.",
      },
      {
        tone: "idea",
        text: "TikTok đang lan nhanh hơn báo qua clip trống phòng. Theo dõi clip ngắn trước khi chỉ đọc Facebook.",
      },
    ],
    prompts: [
      {
        label: "Vì sao có đỉnh 19/9?",
        keywords: ["đỉnh", "19", "hủy"],
        answer:
          "Đỉnh đến từ group host Đà Lạt bàn về khách hủy, không phải từ báo. Hôm đó thảo luận vượt rõ mặt bằng đối thủ.",
      },
      {
        label: "Kênh nào đang lan?",
        keywords: ["kênh", "tiktok", "facebook"],
        answer:
          "Facebook vẫn là khối lớn nhất. TikTok đang lan nhanh hơn qua clip trống phòng giữa tuần mưa.",
      },
    ],
    emotions: [
      { label: "Bức xúc", share: 0.34, color: EMOTION_COLOR.anger },
      { label: "Lo lắng", share: 0.22, color: EMOTION_COLOR.worry },
      { label: "Kể việc", share: 0.28, color: EMOTION_COLOR.account },
      { label: "Hài lòng", share: 0.16, color: EMOTION_COLOR.praise },
    ],
    topics: [
      { name: "Khách hủy phòng", mentions: 642, deltaPercent: 42, negative: 420, neutral: 150, positive: 72 },
      { name: "Homestay Đà Lạt", mentions: 418, deltaPercent: 31, negative: 190, neutral: 150, positive: 78 },
      { name: "Giá phòng theo mùa", mentions: 390, deltaPercent: 11, negative: 120, neutral: 160, positive: 110 },
      { name: "Superhost", mentions: 276, deltaPercent: -6, negative: 40, neutral: 70, positive: 166 },
      { name: "Mùa thấp điểm", mentions: 244, deltaPercent: 55, negative: 150, neutral: 70, positive: 24 },
      { name: "Phí vệ sinh", mentions: 188, deltaPercent: 12, negative: 110, neutral: 52, positive: 26 },
    ],
    phrases: [
      { text: "hủy sát giờ", mentions: 214, deltaPercent: 86 },
      { text: "mất Superhost", mentions: 96, deltaPercent: 120 },
      { text: "phí vệ sinh", mentions: 188, deltaPercent: 12 },
      { text: "hạ 30%", mentions: 74, deltaPercent: 44 },
    ],
    audience: [
      { name: "Chủ nhà", share: 0.61, negative: 0.48, neutral: 0.32, positive: 0.2 },
      { name: "Khách", share: 0.23, negative: 0.18, neutral: 0.36, positive: 0.46 },
      { name: "Báo chí", share: 0.16, negative: 0.14, neutral: 0.7, positive: 0.16 },
    ],
    voices: [
      {
        name: "Lan Anh",
        role: "Chủ nhà · 3 căn Đà Lạt",
        reach: 18200,
        sentiment: "negative",
        quote: "Hạ giá 30% mà lịch vẫn rơi. Mình sợ mất Superhost hơn sợ trống phòng.",
      },
      {
        name: "Minh Khoa",
        role: "Host Sài Gòn · trang cộng đồng",
        reach: 24600,
        sentiment: "negative",
        quote: "Khách hủy sát giờ, phí vệ sinh mình vẫn phải trả. Chính sách đang bảo vệ nhầm người.",
      },
      {
        name: "Hà My",
        role: "Chủ nhà · Hội An",
        reach: 6400,
        sentiment: "positive",
        quote: "Check-in từ trưa và hướng dẫn trước một ngày — hủy giảm thấy rõ.",
      },
    ],
    highlights: [
      {
        source: "Facebook",
        author: "Lan Anh",
        publishedLabel: "18/9",
        title: "Mùa này khách hủy nhiều quá",
        excerpt:
          "Mình đang chạy 3 căn ở Đà Lạt. Mưa xuống là khách hủy liên tục, hạ 30% vẫn không giữ được lịch. Sợ mất Superhost vì tỷ lệ hủy.",
        sentiment: "negative",
        engagement: 1284,
        reach: 18200,
        topics: ["Khách hủy phòng", "Superhost", "Homestay Đà Lạt"],
      },
      {
        source: "Facebook",
        author: "Minh Khoa",
        publishedLabel: "19/9",
        title: "Chính sách hủy đang hại host hơn khách",
        excerpt:
          "Khách hủy sát giờ mà mình vẫn phải trả phí vệ sinh cho đội dọn. Có ai siết chính sách mà không bị tụt thứ hạng không?",
        sentiment: "negative",
        engagement: 860,
        reach: 24600,
        topics: ["Khách hủy phòng", "Phí vệ sinh"],
      },
      {
        source: "Báo",
        author: "VnExpress",
        publishedLabel: "22/9",
        title: "Du lịch Đà Lạt chậm lại trong mùa mưa",
        excerpt:
          "Nhiều cơ sở lưu trú nhỏ cho biết công suất giảm và phải sửa giá theo tuần. Khách đặt phút chót tăng, tỷ lệ hủy cũng tăng.",
        sentiment: "neutral",
        engagement: 2400,
        reach: 410000,
        topics: ["Mùa thấp điểm", "Giá phòng theo mùa"],
      },
      {
        source: "TikTok",
        author: "phongdalat.today",
        publishedLabel: "20/9",
        title: "Trống phòng giữa tuần mưa",
        excerpt:
          "Clip lịch tháng 9 bị gạch đỏ gần nửa. Phần bình luận toàn host hỏi nhau có nên khóa ngày lễ hay hạ giá tiếp.",
        sentiment: "negative",
        engagement: 6400,
        reach: 88000,
        topics: ["Mùa thấp điểm", "Homestay Đà Lạt"],
      },
    ],
  },
  "90d": {
    reach: { value: 6_800_000, deltaPercent: 11 },
    engagement: { value: 241_000, deltaPercent: 9 },
    authors: 4100,
    insights: [
      {
        tone: "good",
        text: "Giá theo mùa là nền cả quý. Đừng để bốn ngày giữa tháng 9 thành kết luận của 90 ngày.",
      },
      {
        tone: "alert",
        text: "Ngày 19/9 vượt đối thủ và kéo sắc thái cả quý về gần cân bằng. Khi so quý, tách đợt hủy ra khỏi các mạch còn lại.",
      },
      {
        tone: "idea",
        text: "Superhost vẫn tích cực. Giữ làm ví dụ vận hành tốt, không trộn với nỗi mất huy hiệu.",
      },
    ],
    prompts: [
      {
        label: "Đối thủ đứng ở đâu?",
        keywords: ["đối thủ", "mặt bằng"],
        answer:
          "Phần lớn quý, thảo luận đi sát mặt bằng đối thủ. Chỉ quanh 19/9 là vượt rõ, đúng đợt hủy phòng ở Đà Lạt.",
      },
      {
        label: "Nên kết luận gì?",
        keywords: ["kết luận", "báo cáo", "quý"],
        answer:
          "Nền của quý là giá theo mùa và Superhost. Đợt hủy là biến động, không phải mạch chính.",
      },
    ],
    emotions: [
      { label: "Bức xúc", share: 0.24, color: EMOTION_COLOR.anger },
      { label: "Lo lắng", share: 0.18, color: EMOTION_COLOR.worry },
      { label: "Kể việc", share: 0.36, color: EMOTION_COLOR.account },
      { label: "Hài lòng", share: 0.22, color: EMOTION_COLOR.praise },
    ],
    topics: [
      { name: "Giá phòng theo mùa", mentions: 1120, deltaPercent: 9, negative: 280, neutral: 470, positive: 370 },
      { name: "Homestay Đà Lạt", mentions: 980, deltaPercent: 14, negative: 340, neutral: 390, positive: 250 },
      { name: "Khách hủy phòng", mentions: 860, deltaPercent: 28, negative: 490, neutral: 250, positive: 120 },
      { name: "Superhost", mentions: 740, deltaPercent: 4, negative: 90, neutral: 180, positive: 470 },
      { name: "Check-in linh hoạt", mentions: 510, deltaPercent: 11, negative: 40, neutral: 140, positive: 330 },
      { name: "Phí vệ sinh", mentions: 430, deltaPercent: 7, negative: 220, neutral: 140, positive: 70 },
    ],
    phrases: [
      { text: "giá cuối tuần", mentions: 340, deltaPercent: 6 },
      { text: "hủy sát giờ", mentions: 260, deltaPercent: 28 },
      { text: "Superhost", mentions: 410, deltaPercent: 4 },
      { text: "phí vệ sinh", mentions: 190, deltaPercent: 7 },
    ],
    audience: [
      { name: "Chủ nhà", share: 0.54, negative: 0.36, neutral: 0.38, positive: 0.26 },
      { name: "Khách", share: 0.27, negative: 0.2, neutral: 0.4, positive: 0.4 },
      { name: "Báo chí", share: 0.19, negative: 0.15, neutral: 0.66, positive: 0.19 },
    ],
    voices: [
      {
        name: "Lan Anh",
        role: "Chủ nhà · 3 căn Đà Lạt",
        reach: 18200,
        sentiment: "negative",
        quote: "Hạ giá 30% mà lịch vẫn rơi. Mình sợ mất Superhost hơn sợ trống phòng.",
      },
      {
        name: "Hà My",
        role: "Chủ nhà · Hội An",
        reach: 6400,
        sentiment: "positive",
        quote: "Check-in từ trưa là thay đổi nhỏ mà review nhắc lại suốt quý.",
      },
      {
        name: "Minh Khoa",
        role: "Host Sài Gòn · trang cộng đồng",
        reach: 24600,
        sentiment: "negative",
        quote: "Cả quý mình thấy host hỏi về hủy nhiều hơn hỏi về giá.",
      },
    ],
    highlights: [
      {
        source: "Báo",
        author: "VnExpress",
        publishedLabel: "22/9",
        title: "Du lịch Đà Lạt chậm lại trong mùa mưa",
        excerpt:
          "Nhiều cơ sở lưu trú nhỏ cho biết công suất giảm và phải sửa giá theo tuần. Khách đặt phút chót tăng, tỷ lệ hủy cũng tăng.",
        sentiment: "neutral",
        engagement: 2400,
        reach: 410000,
        topics: ["Mùa thấp điểm", "Giá phòng theo mùa"],
      },
      {
        source: "Facebook",
        author: "Lan Anh",
        publishedLabel: "18/9",
        title: "Mùa này khách hủy nhiều quá",
        excerpt:
          "Mình đang chạy 3 căn ở Đà Lạt. Mưa xuống là khách hủy liên tục, hạ 30% vẫn không giữ được lịch. Sợ mất Superhost vì tỷ lệ hủy.",
        sentiment: "negative",
        engagement: 1284,
        reach: 18200,
        topics: ["Khách hủy phòng", "Superhost"],
      },
      {
        source: "Facebook",
        author: "Hà My",
        publishedLabel: "12/9",
        title: "Check-in linh hoạt giữ được khách ở lại",
        excerpt:
          "Mình mở check-in từ 12h và gửi hướng dẫn trước một ngày. Tháng này hủy giảm, review nhắc đúng khoản này.",
        sentiment: "positive",
        engagement: 412,
        reach: 6400,
        topics: ["Check-in linh hoạt", "Superhost"],
      },
      {
        source: "TikTok",
        author: "phongdalat.today",
        publishedLabel: "20/9",
        title: "Trống phòng giữa tuần mưa",
        excerpt:
          "Clip lịch tháng 9 bị gạch đỏ gần nửa. Phần bình luận toàn host hỏi nhau có nên khóa ngày lễ hay hạ giá tiếp.",
        sentiment: "negative",
        engagement: 6400,
        reach: 88000,
        topics: ["Mùa thấp điểm", "Homestay Đà Lạt"],
      },
    ],
  },
};

function shiftDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function dayCounts(daysBeforeEnd: number) {
  const phase = 180 - daysBeforeEnd;
  const wave =
    96 +
    Math.round(14 * Math.sin(phase / 5.2) + 9 * Math.cos(phase / 2.4));
  const weekday = shiftDays(SERIES_END, -daysBeforeEnd).getUTCDay();
  const weekend = weekday === 0 || weekday === 6 ? 16 : 0;
  const dist = daysBeforeEnd - 13;
  const spike = Math.round(220 * Math.exp(-(dist * dist) / 18));
  const total = Math.max(24, wave + weekend + spike);
  const heat = Math.exp(-(dist * dist) / 26);
  const negativeShare = 0.27 + heat * 0.22;
  const positiveShare = 0.35 - heat * 0.12;
  const negative = Math.round(total * negativeShare);
  const positive = Math.round(total * positiveShare);
  const neutral = Math.max(0, total - negative - positive);

  return { negative, neutral, positive };
}

function competitorOnDay(daysBeforeEnd: number) {
  const phase = 180 - daysBeforeEnd;
  return 94 + Math.round(6 * Math.sin(phase / 8) + 4 * Math.cos(phase / 3.4));
}

function peakCause(daysBeforeEnd: number) {
  if (Math.abs(daysBeforeEnd - 13) <= 4) {
    return "Đợt khách hủy ở Đà Lạt";
  }

  return "Phí vệ sinh vẫn được nhắc";
}

function negativeShareOf(counts: {
  negative: number;
  neutral: number;
  positive: number;
}) {
  const total = totalOf(counts);
  if (total === 0) {
    return 0;
  }

  return (counts.negative / total) * 100;
}

function sumWindow(startDaysBeforeEnd: number, length: number) {
  const totals = { negative: 0, neutral: 0, positive: 0 };

  for (let offset = 0; offset < length; offset += 1) {
    const day = dayCounts(startDaysBeforeEnd + offset);
    totals.negative += day.negative;
    totals.neutral += day.neutral;
    totals.positive += day.positive;
  }

  return totals;
}

function totalOf(counts: { negative: number; neutral: number; positive: number }) {
  return counts.negative + counts.neutral + counts.positive;
}

function percentDelta(current: number, previous: number) {
  if (previous === 0) {
    return 0;
  }

  return ((current - previous) / previous) * 100;
}

function netScore(counts: { negative: number; neutral: number; positive: number }) {
  const total = totalOf(counts);
  if (total === 0) {
    return 0;
  }

  return ((counts.positive - counts.negative) / total) * 100;
}

function splitCounts(total: number, weights: readonly number[]) {
  const values = weights.map((weight) => Math.round(total * weight));
  const drift = total - values.reduce((sum, value) => sum + value, 0);
  values[values.length - 1] += drift;
  return values;
}

function formatDay(date: Date) {
  return `${date.getUTCDate()}/${date.getUTCMonth() + 1}`;
}

function volumeClause(deltaPercent: number) {
  const rounded = Math.round(deltaPercent);
  if (rounded > 1) {
    return `tăng ${rounded}%`;
  }
  if (rounded < -1) {
    return `giảm ${Math.abs(rounded)}%`;
  }
  return "đi ngang";
}

function toneClause(net: number, netDelta: number) {
  const level = Math.round(net);
  const delta = Math.round(netDelta);
  const move =
    delta > 0
      ? `dương hơn ${delta} điểm`
      : delta < 0
        ? `âm hơn ${Math.abs(delta)} điểm`
        : "không đổi so với kỳ trước";

  return `sắc thái ròng ${level}, ${move}`;
}

function buildBrief(
  period: ListeningPeriod,
  rangeLabel: string,
  mentions: number,
  deltaPercent: number,
  net: number,
  netDelta: number,
  peakLabel: string,
) {
  const volume = `${mentions.toLocaleString("vi-VN")} thảo luận, ${volumeClause(deltaPercent)}`;
  const tone = toneClause(net, netDelta);

  if (period === "7d") {
    return `Tuần ${rangeLabel}: ${volume} so với tuần trước, ${tone}. Đỉnh hủy phòng đã nằm ở tuần trước.`;
  }

  if (period === "90d") {
    return `Kỳ ${rangeLabel}: ${volume} so với 90 ngày trước, ${tone}. Giá theo mùa là nền; ngày ${peakLabel} là biến động của quý.`;
  }

  return `Kỳ ${rangeLabel}: ${volume} so với 30 ngày trước, ${tone}. Cao nhất là ${peakLabel}, đúng đợt hủy phòng ở Đà Lạt.`;
}

export function getListeningDemo(period: ListeningPeriod): ListeningDemo {
  const days = PERIOD_DAYS[period];
  const current = sumWindow(0, days);
  const previous = sumWindow(days, days);
  const currentTotal = totalOf(current);
  const mentionsDelta = percentDelta(currentTotal, totalOf(previous));
  const net = netScore(current);
  const netDelta = net - netScore(previous);
  const start = shiftDays(SERIES_END, -(days - 1));
  const rangeLabel = `${formatDay(start)} – ${formatDay(SERIES_END)}`;
  const story = PERIOD_STORY[period];

  const volume: VolumePoint[] = [];
  for (let daysBeforeEnd = days - 1; daysBeforeEnd >= 0; daysBeforeEnd -= 1) {
    const date = shiftDays(SERIES_END, -daysBeforeEnd);
    volume.push({
      date: date.toISOString().slice(0, 10),
      label: formatDay(date),
      ...dayCounts(daysBeforeEnd),
      competitors: competitorOnDay(daysBeforeEnd),
    });
  }

  const peak = volume.reduce(
    (best, point, index) => {
      const total = point.negative + point.neutral + point.positive;
      if (total <= best.total) {
        return best;
      }

      const daysBeforeEnd = days - 1 - index;
      return {
        label: point.label,
        total,
        cause: peakCause(daysBeforeEnd),
      };
    },
    {
      label: volume[0]?.label ?? "",
      total: 0,
      cause: peakCause(days - 1),
    },
  );

  const channelValues = splitCounts(
    currentTotal,
    CHANNEL_WEIGHTS.map((item) => item[1]),
  );
  const placeValues = splitCounts(
    currentTotal,
    PLACE_WEIGHTS.map((item) => item[1]),
  );

  return {
    period,
    rangeLabel,
    comparisonLabel:
      period === "7d"
        ? "so với 7 ngày trước"
        : period === "90d"
          ? "so với 90 ngày trước"
          : "so với 30 ngày trước",
    brief: buildBrief(
      period,
      rangeLabel,
      currentTotal,
      mentionsDelta,
      net,
      netDelta,
      peak.label,
    ),
    insights: story.insights,
    prompts: story.prompts,
    volume,
    peak,
    mentions: { value: currentTotal, deltaPercent: mentionsDelta },
    negativeShare: {
      value: negativeShareOf(current),
      deltaPoints: negativeShareOf(current) - negativeShareOf(previous),
    },
    reach: story.reach,
    engagement: story.engagement,
    authors: story.authors,
    netSentiment: { value: net, deltaPoints: netDelta },
    sentiment: current,
    emotions: story.emotions,
    topics: story.topics,
    phrases: story.phrases,
    audience: story.audience,
    voices: story.voices,
    channels: CHANNEL_WEIGHTS.map(([name], index) => ({
      name,
      value: channelValues[index] ?? 0,
    })),
    places: PLACE_WEIGHTS.map(([name], index) => ({
      name,
      value: placeValues[index] ?? 0,
    })),
    highlights: story.highlights,
  };
}
