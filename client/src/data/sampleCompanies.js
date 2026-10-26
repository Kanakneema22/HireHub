const companyNames = [
  "Asterbyte", "BlueOrbit", "CedarStack", "DeltaNova", "EchoGrid", "Foxglove Tech", "GreenPixel", "HelioWorks", "IndigoCircuit", "Juniper Labs", "KiteBridge", "LumenTrail", "MintLayer", "Northstar Code", "OpenVista", "PixelHarbor", "Quartzline", "Riverstone Digital", "SilverFern", "TerraLoop", "UmberCloud", "VertexBloom", "WillowWare", "XenoSpark", "YellowBrick Tech", "ZenithPath", "AmberStack", "BrightMosaic", "CopperLeaf", "Driftwood Systems"
];
const specialties = ["Software Studio", "Cloud Labs", "Digital Systems"];
const cities = [
  ["Bengaluru", "Karnataka"], ["Hyderabad", "Telangana"], ["Pune", "Maharashtra"], ["Chennai", "Tamil Nadu"], ["Mumbai", "Maharashtra"], ["Gurugram", "Haryana"], ["Noida", "Uttar Pradesh"], ["New Delhi", "Delhi"], ["Kolkata", "West Bengal"], ["Ahmedabad", "Gujarat"], ["Kochi", "Kerala"], ["Jaipur", "Rajasthan"], ["Indore", "Madhya Pradesh"], ["Coimbatore", "Tamil Nadu"], ["Thiruvananthapuram", "Kerala"], ["Mysuru", "Karnataka"], ["Chandigarh", "Chandigarh"], ["Bhubaneswar", "Odisha"], ["Nagpur", "Maharashtra"], ["Lucknow", "Uttar Pradesh"], ["Visakhapatnam", "Andhra Pradesh"], ["Surat", "Gujarat"], ["Vadodara", "Gujarat"], ["Mangaluru", "Karnataka"], ["Nashik", "Maharashtra"], ["Bhopal", "Madhya Pradesh"], ["Gandhinagar", "Gujarat"], ["Vijayawada", "Andhra Pradesh"], ["Madurai", "Tamil Nadu"], ["Dehradun", "Uttarakhand"]
];
const focusAreas = ["Web development", "Cloud & DevOps", "Data & analytics", "AI & machine learning", "Cybersecurity", "Mobile apps", "Product engineering", "IT consulting", "Quality engineering", "Enterprise software"];

// Fictional showcase entries for the HireHub demo; they do not represent real businesses.
export const sampleCompanies = companyNames.flatMap((name, companyIndex) =>
  specialties.map((specialty, specialtyIndex) => {
    const index = companyIndex * specialties.length + specialtyIndex;
    const [city, state] = cities[index % cities.length];
    return {
      id: `sample-company-${index + 1}`,
      name: `${name} ${specialty}`,
      city,
      state,
      focus: focusAreas[index % focusAreas.length],
      sample: true,
    };
  }),
);
