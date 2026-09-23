/**
 * Sample Organization Data
 * Structured for Parent-Child hierarchical rendering
 */
window.SAMPLE_ORG_DATA = [
  {
    id: "EMP001",
    name: "ดร. สมชาย สุขเกษม",
    position: "Chief Executive Officer (CEO)",
    department: "Executive Board",
    reportsTo: "",
    roleLevel: "C-Level",
    email: "somchai.s@company.co.th",
    phone: "081-234-5678",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "EMP002",
    name: "กิตติพงษ์ วิริยะกุล",
    position: "Chief Technology Officer (CTO)",
    department: "Technology",
    reportsTo: "EMP001",
    roleLevel: "C-Level",
    email: "kittipong.v@company.co.th",
    phone: "082-345-6789",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "EMP003",
    name: "พิมลดา รัตนโชติ",
    position: "Chief Marketing Officer (CMO)",
    department: "Marketing",
    reportsTo: "EMP001",
    roleLevel: "C-Level",
    email: "pimonlada.r@company.co.th",
    phone: "083-456-7890",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "EMP004",
    name: "อนันต์ เจริญสุข",
    position: "Chief Financial Officer (CFO)",
    department: "Finance",
    reportsTo: "EMP001",
    roleLevel: "C-Level",
    email: "anant.c@company.co.th",
    phone: "084-567-8901",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "EMP005",
    name: "ธนพร ศิริวัฒน์",
    position: "VP of People & Culture",
    department: "Human Resources",
    reportsTo: "EMP001",
    roleLevel: "Director",
    email: "thanaporn.s@company.co.th",
    phone: "085-678-9012",
    avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80"
  },
  // Technology Team
  {
    id: "EMP006",
    name: "วรเมธ ปัญญางาม",
    position: "Head of Software Engineering",
    department: "Technology",
    reportsTo: "EMP002",
    roleLevel: "Director",
    email: "worameth.p@company.co.th",
    phone: "086-789-0123",
    avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "EMP007",
    name: "ณัฐกานต์ วรโชติ",
    position: "Head of Cloud & Infrastructure",
    department: "Technology",
    reportsTo: "EMP002",
    roleLevel: "Director",
    email: "nattakarn.w@company.co.th",
    phone: "087-890-1234",
    avatarUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "EMP008",
    name: "ชานนท์ สิทธิผล",
    position: "Lead Frontend Developer",
    department: "Technology",
    reportsTo: "EMP006",
    roleLevel: "Manager",
    email: "chanon.s@company.co.th",
    phone: "088-901-2345",
    avatarUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "EMP009",
    name: "ศุภชัย มั่นคง",
    position: "Lead Backend Developer",
    department: "Technology",
    reportsTo: "EMP006",
    roleLevel: "Manager",
    email: "supachai.m@company.co.th",
    phone: "089-012-3456",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "EMP010",
    name: "ลลิตา ธนาธิป",
    position: "UI/UX Product Designer",
    department: "Technology",
    reportsTo: "EMP008",
    roleLevel: "Staff",
    email: "lalita.t@company.co.th",
    phone: "090-123-4567",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "EMP011",
    name: "ภาณุพงศ์ บุญประเสริฐ",
    position: "DevOps & Security Engineer",
    department: "Technology",
    reportsTo: "EMP007",
    roleLevel: "Staff",
    email: "panupong.b@company.co.th",
    phone: "091-234-5678",
    avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80"
  },
  // Marketing Team
  {
    id: "EMP012",
    name: "อรพินท์ มิ่งขวัญ",
    position: "Director of Brand & Communications",
    department: "Marketing",
    reportsTo: "EMP003",
    roleLevel: "Director",
    email: "orapin.m@company.co.th",
    phone: "092-345-6789",
    avatarUrl: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "EMP013",
    name: "ธนาวุฒิ ทรัพย์มั่นคง",
    position: "Performance Marketing Manager",
    department: "Marketing",
    reportsTo: "EMP012",
    roleLevel: "Manager",
    email: "thanawut.s@company.co.th",
    phone: "093-456-7890",
    avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "EMP014",
    name: "กมลวรรณ วงศ์สุวรรณ",
    position: "Senior Content Creator",
    department: "Marketing",
    reportsTo: "EMP013",
    roleLevel: "Staff",
    email: "kamolwan.w@company.co.th",
    phone: "094-567-8901",
    avatarUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80"
  },
  // Human Resources Team
  {
    id: "EMP015",
    name: "รุ่งนภา พัฒนกิจ",
    position: "HR Operations & Talent Manager",
    department: "Human Resources",
    reportsTo: "EMP005",
    roleLevel: "Manager",
    email: "rungnapa.p@company.co.th",
    phone: "095-678-9012",
    avatarUrl: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "EMP016",
    name: "พีรพล แสงเพชร",
    position: "Talent Acquisition Specialist",
    department: "Human Resources",
    reportsTo: "EMP015",
    roleLevel: "Staff",
    email: "peerapol.s@company.co.th",
    phone: "096-789-0123",
    avatarUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80"
  },
  // Finance Team
  {
    id: "EMP017",
    name: "จันทร์ทิพย์ ชัยมงคล",
    position: "Accounting & Tax Manager",
    department: "Finance",
    reportsTo: "EMP004",
    roleLevel: "Manager",
    email: "janthip.c@company.co.th",
    phone: "097-890-1234",
    avatarUrl: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "EMP018",
    name: "กิตติศักดิ์ ศรีสมบูรณ์",
    position: "Senior Financial Analyst",
    department: "Finance",
    reportsTo: "EMP017",
    roleLevel: "Staff",
    email: "kittisak.s@company.co.th",
    phone: "098-901-2345",
    avatarUrl: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&auto=format&fit=crop&q=80"
  }
];

var SAMPLE_ORG_DATA = window.SAMPLE_ORG_DATA;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SAMPLE_ORG_DATA: window.SAMPLE_ORG_DATA };
}
