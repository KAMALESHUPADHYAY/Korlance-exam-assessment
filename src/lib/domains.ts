export interface DomainMeta {
  name: string;
  slug: string;
  fileName: string;
  iconKey:
    | "flask"
    | "bar-chart"
    | "cpu"
    | "globe"
    | "smartphone"
    | "code"
    | "database"
    | "shield"
    | "cloud"
    | "wifi"
    | "microchip"
    | "layers"
    | "palette"
    | "compass"
    | "megaphone"
    | "trending-up";
  topics: string;
  gradient: string;
  border: string;
  badge: string;
}

export const DOMAINS: DomainMeta[] = [
  {
    name: "Data Science",
    slug: "data-science",
    fileName: "data-science.json",
    iconKey: "flask",
    topics: "Statistics, Pandas, EDA, Hypothesis Testing, Feature Scaling",
    gradient: "from-violet-600/30 via-purple-600/20 to-fuchsia-600/20",
    border: "border-purple-400/30",
    badge: "bg-purple-500/20 text-purple-200",
  },
  {
    name: "Data Analytics",
    slug: "data-analytics",
    fileName: "data-analytics.json",
    iconKey: "bar-chart",
    topics: "Excel, SQL, Power BI/Tableau, KPIs, Data Cleaning, Visualization",
    gradient: "from-cyan-600/30 via-sky-600/20 to-blue-600/20",
    border: "border-cyan-400/30",
    badge: "bg-cyan-500/20 text-cyan-200",
  },
  {
    name: "AI / ML",
    slug: "ai-ml",
    fileName: "ai-ml.json",
    iconKey: "cpu",
    topics: "Supervised/Unsupervised, Metrics, Overfitting, Neural Nets, Transformers",
    gradient: "from-fuchsia-600/30 via-pink-600/20 to-rose-600/20",
    border: "border-pink-400/30",
    badge: "bg-pink-500/20 text-pink-200",
  },
  {
    name: "Web Development",
    slug: "web-development",
    fileName: "web-development.json",
    iconKey: "globe",
    topics: "HTML/CSS/JS, React, Next.js, REST APIs, Security, CORS",
    gradient: "from-blue-600/30 via-indigo-600/20 to-cyan-600/20",
    border: "border-blue-400/30",
    badge: "bg-blue-500/20 text-blue-200",
  },
  {
    name: "App Development",
    slug: "app-development",
    fileName: "app-development.json",
    iconKey: "smartphone",
    topics: "Flutter, React Native, Android, State Management, App Lifecycle",
    gradient: "from-indigo-600/30 via-violet-600/20 to-sky-600/20",
    border: "border-indigo-400/30",
    badge: "bg-indigo-500/20 text-indigo-200",
  },
  {
    name: "Python & Programming",
    slug: "python-programming",
    fileName: "python-programming.json",
    iconKey: "code",
    topics: "Core Python, Data Structures, Complexity, OOP",
    gradient: "from-emerald-600/30 via-teal-600/20 to-cyan-600/20",
    border: "border-emerald-400/30",
    badge: "bg-emerald-500/20 text-emerald-200",
  },
  {
    name: "Databases & Tech",
    slug: "databases-tech",
    fileName: "databases-tech.json",
    iconKey: "database",
    topics: "SQL Joins, Indexing, ACID, Normalization, Git, Docker",
    gradient: "from-amber-600/30 via-orange-600/20 to-yellow-600/20",
    border: "border-amber-400/30",
    badge: "bg-amber-500/20 text-amber-200",
  },
  {
    name: "Cyber Security",
    slug: "cyber-security",
    fileName: "cyber-security.json",
    iconKey: "shield",
    topics: "Networking, OWASP Top 10, Cryptography, Malware, Ethical Hacking",
    gradient: "from-rose-600/30 via-red-600/20 to-orange-600/20",
    border: "border-rose-400/30",
    badge: "bg-rose-500/20 text-rose-200",
  },
  {
    name: "Cloud Computing",
    slug: "cloud-computing",
    fileName: "cloud-computing.json",
    iconKey: "cloud",
    topics: "IaaS/PaaS/SaaS, AWS/Azure/GCP, Virtualization, Containers, Storage",
    gradient: "from-sky-600/30 via-blue-600/20 to-indigo-600/20",
    border: "border-sky-400/30",
    badge: "bg-sky-500/20 text-sky-200",
  },
  {
    name: "IoT",
    slug: "iot",
    fileName: "iot.json",
    iconKey: "wifi",
    topics: "Sensors, MQTT, Arduino/Raspberry Pi, Protocols, Edge Computing",
    gradient: "from-teal-600/30 via-emerald-600/20 to-green-600/20",
    border: "border-teal-400/30",
    badge: "bg-teal-500/20 text-teal-200",
  },
  {
    name: "Embedded Systems",
    slug: "embedded-systems",
    fileName: "embedded-systems.json",
    iconKey: "microchip",
    topics: "Microcontrollers, RTOS, Interrupts, UART/SPI/I2C, Embedded C",
    gradient: "from-orange-600/30 via-amber-600/20 to-red-600/20",
    border: "border-orange-400/30",
    badge: "bg-orange-500/20 text-orange-200",
  },
  {
    name: "VLSI Design",
    slug: "vlsi-design",
    fileName: "vlsi-design.json",
    iconKey: "layers",
    topics: "CMOS, Logic Gates, Verilog/VHDL, FPGA, Timing Analysis",
    gradient: "from-purple-600/30 via-indigo-600/20 to-violet-600/20",
    border: "border-violet-400/30",
    badge: "bg-violet-500/20 text-violet-200",
  },
  {
    name: "UI/UX Design",
    slug: "ui-ux-design",
    fileName: "ui-ux-design.json",
    iconKey: "palette",
    topics: "User Research, Wireframes, Figma, Design Principles, Accessibility",
    gradient: "from-pink-600/30 via-rose-600/20 to-fuchsia-600/20",
    border: "border-pink-400/30",
    badge: "bg-pink-500/20 text-pink-200",
  },
  {
    name: "AutoCAD",
    slug: "autocad",
    fileName: "autocad.json",
    iconKey: "compass",
    topics: "Commands, Layers, Dimensioning, 2D/3D Drafting, Blocks, Plotting",
    gradient: "from-yellow-600/30 via-amber-600/20 to-lime-600/20",
    border: "border-yellow-400/30",
    badge: "bg-yellow-500/20 text-yellow-200",
  },
  {
    name: "Digital Marketing",
    slug: "digital-marketing",
    fileName: "digital-marketing.json",
    iconKey: "megaphone",
    topics: "SEO, SEM, Social Media, Email Marketing, Analytics, Content",
    gradient: "from-lime-600/30 via-emerald-600/20 to-teal-600/20",
    border: "border-lime-400/30",
    badge: "bg-lime-500/20 text-lime-200",
  },
  {
    name: "Finance",
    slug: "finance",
    fileName: "finance.json",
    iconKey: "trending-up",
    topics: "Accounting, Financial Statements, Ratios, Time Value of Money, Markets",
    gradient: "from-green-600/30 via-emerald-600/20 to-sky-600/20",
    border: "border-green-400/30",
    badge: "bg-green-500/20 text-green-200",
  },
];

export const VALID_DOMAIN_NAMES = new Set(DOMAINS.map((d) => d.name));

export function isValidDomain(domain: string): boolean {
  return VALID_DOMAIN_NAMES.has(domain);
}
