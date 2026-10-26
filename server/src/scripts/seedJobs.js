require("dotenv").config();

const mongoose = require("mongoose");
const Job = require("../models/Job");

const atlasSeedHosts = [
  "ac-tiwrhvq-shard-00-00.kcdvltg.mongodb.net:27017",
  "ac-tiwrhvq-shard-00-01.kcdvltg.mongodb.net:27017",
  "ac-tiwrhvq-shard-00-02.kcdvltg.mongodb.net:27017",
];

function directSeedUri(srvUri) {
  const parsed = new URL(srvUri);
  const credentials = parsed.username
    ? `${parsed.username}${parsed.password ? `:${parsed.password}` : ""}@`
    : "";
  const options = new URLSearchParams(parsed.searchParams);
  options.set("tls", "true");
  if (!options.has("authSource")) options.set("authSource", "admin");
  return `mongodb://${credentials}${atlasSeedHosts.join(",")}${parsed.pathname || "/"}?${options.toString()}`;
}

const sampleJobs = [
  {
    title: "Frontend Developer",
    company: "TechNova",
    location: "Bengaluru, India",
    type: "Full-time",
    workplace: "Hybrid",
    experience: "0–2 years",
    salary: "₹6–10 LPA",
    posted: "Recently",
    category: "Engineering",
    color: "violet",
    initials: "TN",
    skills: ["React", "JavaScript", "CSS"],
    description:
      "Build accessible, responsive interfaces with a collaborative product team.",
    responsibilities: [
      "Build reusable React components.",
      "Integrate REST APIs.",
      "Improve performance and accessibility.",
    ],
    requirements: [
      "JavaScript and React fundamentals.",
      "Familiarity with Git and REST APIs.",
    ],
  },
  {
    title: "MERN Stack Developer",
    company: "PixelCraft",
    location: "Indore, India",
    type: "Full-time",
    workplace: "Remote",
    experience: "Entry level",
    salary: "₹5–8 LPA",
    posted: "Recently",
    category: "Engineering",
    color: "orange",
    initials: "PC",
    skills: ["React", "Node.js", "Express", "MongoDB"],
    description: "Help build full-stack web applications using the MERN stack.",
    responsibilities: [
      "Develop React features.",
      "Build Express APIs.",
      "Work with MongoDB models.",
    ],
    requirements: [
      "JavaScript fundamentals.",
      "Basic knowledge of React and Node.js.",
    ],
  },
  {
    title: "Junior React Developer",
    company: "CloudPeak",
    location: "Pune, India",
    type: "Full-time",
    workplace: "On-site",
    experience: "0–1 years",
    salary: "₹4–7 LPA",
    posted: "Recently",
    category: "Engineering",
    color: "blue",
    initials: "CP",
    skills: ["React", "Redux", "REST API"],
    description:
      "Work with a product team to deliver polished, reliable React experiences.",
    responsibilities: [
      "Implement interface features.",
      "Integrate backend APIs.",
      "Fix bugs and improve accessibility.",
    ],
    requirements: [
      "JavaScript and React fundamentals.",
      "Basic state management knowledge.",
    ],
  },
  {
    title: "UI Developer Intern",
    company: "DesignOrbit",
    location: "Mumbai, India",
    type: "Internship",
    workplace: "Hybrid",
    experience: "Internship",
    salary: "₹20k–30k/month",
    posted: "Recently",
    category: "Design & Development",
    color: "pink",
    initials: "DO",
    skills: ["HTML", "CSS", "JavaScript"],
    description:
      "Create thoughtful interfaces with an emphasis on responsive design and usability.",
    responsibilities: [
      "Turn designs into responsive pages.",
      "Check cross-browser behavior.",
      "Work with reusable UI patterns.",
    ],
    requirements: [
      "HTML and CSS fundamentals.",
      "Interest in accessible, responsive design.",
    ],
  },
  {
    title: "Node.js Developer",
    company: "DevBridge",
    location: "Remote, India",
    type: "Contract",
    workplace: "Remote",
    experience: "1–3 years",
    salary: "₹8–12 LPA",
    posted: "Recently",
    category: "Engineering",
    color: "green",
    initials: "DB",
    skills: ["Node.js", "Express", "MongoDB"],
    description:
      "Develop secure backend services and APIs for growing web products.",
    responsibilities: [
      "Build and maintain REST APIs.",
      "Implement validation.",
      "Improve database queries.",
    ],
    requirements: [
      "Experience with Node.js and Express.",
      "Understanding of HTTP and MongoDB.",
    ],
  },
  {
    title: "Software Engineer Intern",
    company: "LaunchLabs",
    location: "Hyderabad, India",
    type: "Internship",
    workplace: "On-site",
    experience: "Internship",
    salary: "₹15k–25k/month",
    posted: "Recently",
    category: "Engineering",
    color: "blue",
    initials: "LL",
    skills: ["JavaScript", "Git", "Problem Solving"],
    description:
      "Learn from experienced engineers while contributing to useful product features.",
    responsibilities: [
      "Contribute to development tasks.",
      "Review and debug code.",
      "Collaborate with the engineering team.",
    ],
    requirements: [
      "Programming fundamentals.",
      "Basic Git knowledge and willingness to learn.",
    ],
  },
 ];

const demoCompanies = [
  "Asterbyte", "BlueOrbit", "CedarStack", "DeltaNova", "EchoGrid", "Foxglove Tech", "GreenPixel", "HelioWorks", "IndigoCircuit", "Juniper Labs", "KiteBridge", "LumenTrail", "MintLayer", "Northstar Code", "OpenVista", "PixelHarbor", "Quartzline", "Riverstone Digital", "SilverFern", "TerraLoop", "UmberCloud", "VertexBloom", "WillowWare", "XenoSpark", "YellowBrick Tech", "ZenithPath", "AmberStack", "BrightMosaic", "CopperLeaf", "Driftwood Systems"
];
const demoSpecialties = ["Software Studio", "Cloud Labs", "Digital Systems"];
const demoCities = [
  ["Bengaluru", "Karnataka"], ["Hyderabad", "Telangana"], ["Pune", "Maharashtra"], ["Chennai", "Tamil Nadu"], ["Mumbai", "Maharashtra"], ["Gurugram", "Haryana"], ["Noida", "Uttar Pradesh"], ["New Delhi", "Delhi"], ["Kolkata", "West Bengal"], ["Ahmedabad", "Gujarat"], ["Kochi", "Kerala"], ["Jaipur", "Rajasthan"], ["Indore", "Madhya Pradesh"], ["Coimbatore", "Tamil Nadu"], ["Thiruvananthapuram", "Kerala"], ["Mysuru", "Karnataka"], ["Chandigarh", "Chandigarh"], ["Bhubaneswar", "Odisha"], ["Nagpur", "Maharashtra"], ["Lucknow", "Uttar Pradesh"], ["Visakhapatnam", "Andhra Pradesh"], ["Surat", "Gujarat"], ["Vadodara", "Gujarat"], ["Mangaluru", "Karnataka"], ["Nashik", "Maharashtra"], ["Bhopal", "Madhya Pradesh"], ["Gandhinagar", "Gujarat"], ["Vijayawada", "Andhra Pradesh"], ["Madurai", "Tamil Nadu"], ["Dehradun", "Uttarakhand"]
];
const demoRoles = [
  { title: "Junior Frontend Developer", category: "Engineering", skills: ["React", "JavaScript", "CSS"] },
  { title: "Backend Developer", category: "Engineering", skills: ["Node.js", "REST APIs", "MongoDB"] },
  { title: "Software Engineer Intern", category: "Engineering", skills: ["JavaScript", "Git", "Problem solving"] },
  { title: "QA Automation Engineer", category: "Quality Engineering", skills: ["Testing", "Playwright", "JavaScript"] },
  { title: "Data Analyst", category: "Data & Analytics", skills: ["SQL", "Python", "Data visualization"] },
  { title: "Cloud Support Associate", category: "Cloud & DevOps", skills: ["Linux", "Cloud basics", "Networking"] },
  { title: "UI/UX Designer", category: "Design", skills: ["Figma", "Prototyping", "UI design"] },
  { title: "Mobile App Developer", category: "Engineering", skills: ["React Native", "JavaScript", "APIs"] },
  { title: "Technical Support Engineer", category: "IT Support", skills: ["Troubleshooting", "Linux", "Communication"] },
  { title: "Product Operations Associate", category: "Product", skills: ["Documentation", "Analysis", "Communication"] },
];
const demoJobs = demoCompanies.flatMap((name, companyIndex) => demoSpecialties.map((specialty, specialtyIndex) => {
  const index = companyIndex * demoSpecialties.length + specialtyIndex;
  const role = demoRoles[index % demoRoles.length];
  const [city, state] = demoCities[index % demoCities.length];
  const company = `${name} ${specialty}`;
  return {
    title: role.title, company, location: `${city}, ${state}, India`,
    type: ["Full-time", "Internship", "Contract"][index % 3],
    workplace: ["Hybrid", "Remote", "On-site"][index % 3],
    salary: ["₹3–5 LPA", "₹4–7 LPA", "₹5–8 LPA"][index % 3],
    description: `SAMPLE LISTING — fictional demo opportunity at ${company}. This placeholder is not a real vacancy.`,
    responsibilities: ["Collaborate with a project team on practical tasks.", "Document progress and share updates.", "Learn the team's development practices."],
    requirements: ["Foundational knowledge for this role.", "Clear communication and willingness to learn."],
    skills: role.skills, experience: index % 3 === 2 ? "Internship / entry level" : "0–2 years",
    category: role.category, posted: "Sample", color: ["violet", "blue", "green", "orange"][index % 4],
    initials: company.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
    isSample: true,
  };
}));
async function seedJobs() {
  if (!process.env.MONGODB_URI)
    throw new Error("MONGODB_URI is missing in server/.env");
  const mongoUri = process.env.MONGODB_URI;
  try {
    await mongoose.connect(mongoUri);
  } catch (error) {
    const isSrvLookupFailure = mongoUri.startsWith("mongodb+srv://") && /querySrv/i.test(error.message);
    if (!isSrvLookupFailure) throw error;
    console.warn("MongoDB SRV lookup failed; retrying with the configured Atlas seed hosts.");
    await mongoose.connect(directSeedUri(mongoUri));
  }

  const operations = [...sampleJobs, ...demoJobs].map((job) => ({
    updateOne: {
      filter: {
        title: job.title,
        company: job.company,
        location: job.location,
      },
      update: { $setOnInsert: job },
      upsert: true,
    },
  }));
  const result = await Job.bulkWrite(operations, { ordered: true });
  console.log(
    `Seed complete: ${result.upsertedCount} added, ${result.matchedCount} already present.`,
  );
}

seedJobs()
  .catch((error) => {
    console.error("Job seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });






