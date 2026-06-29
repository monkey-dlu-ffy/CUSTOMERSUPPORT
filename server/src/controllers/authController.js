const User = require("../models/User");
const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const bcrypt = require("bcrypt"); 
const jwt = require("jsonwebtoken");
// --- 1. Standard Customer Registration (Domain Matching) ---
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body; 
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        // --- THE DOMAIN MATCHING MAGIC ---
        // 1. Extract the domain (e.g., 'tony@stark.com' becomes 'stark.com')
        const emailDomain = email.split('@')[1].toLowerCase();

        // 2. Look for an Organization that owns this domain
        const matchedOrg = await Organization.findOne({ domain: emailDomain });

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 3. Create the user. If an org was found, attach the ID. If not, it remains undefined.
        const user = await User.create({ 
            name, 
            email, 
            password: hashedPassword,
            role: "Customer",
            organizationId: matchedOrg ? matchedOrg._id : undefined
        });

        res.status(201).json({ 
            message: matchedOrg 
                ? `Registered and joined ${matchedOrg.name}` 
                : "Registered successfully", 
            user 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- 2. Global Login (Two-Phase for Customers) ---
// Phase 1: { email, password }              → validates creds, returns org list (for Customer)
// Phase 2: { email, password, selectedOrganizationId } → issues JWT scoped to chosen org
const login = async (req, res) => {
    try {
        const { email, password, selectedOrganizationId } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Non-customer roles always get their token immediately (no org picker needed)
        if (user.role !== 'Customer') {
            const tokenPayload = { userId: user._id, role: user.role };
            if (user.organizationId) tokenPayload.organizationId = user.organizationId;
            const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: "1d" });
            return res.status(200).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                organizationId: user.organizationId,
                token
            });
        }

        // --- CUSTOMER FLOW ---
        // Phase 2: org has been chosen — issue JWT scoped to that org
        if (selectedOrganizationId) {
            // Validate the provided org ID is real
            if (!mongoose.Types.ObjectId.isValid(selectedOrganizationId)) {
                return res.status(400).json({ message: 'Invalid organization selected.' });
            }
            const org = await Organization.findById(selectedOrganizationId);
            if (!org) {
                return res.status(400).json({ message: 'Selected organization not found.' });
            }

            const tokenPayload = {
                userId: user._id,
                role: user.role,
                organizationId: org._id
            };
            const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: "1d" });
            return res.status(200).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                organizationId: org._id,
                organizationName: org.name,
                token
            });
        }

        // Phase 1: credentials valid — fetch all orgs and ask the customer to pick one
        const organizations = await Organization.find({}, '_id name').sort({ name: 1 });
        return res.status(200).json({
            status: 'org_selection_required',
            userId: user._id,
            name: user.name,
            email: user.email,
            organizations
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- 2b. Get All Organizations (public, for login org picker) ---
const getOrganizations = async (req, res) => {
    try {
        const orgs = await Organization.find({}, '_id name').sort({ name: 1 });
        res.status(200).json(orgs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- 3. B2B Tenant Registration (Create Company & Owner) ---
const registerCompanyAndOwner = async (req, res) => {
  const { companyName, ownerName, ownerEmail, password } = req.body;

  try {
    const existingUser = await User.findOne({ email: ownerEmail });
    if (existingUser) return res.status(400).json({ message: "Email already in use." });

    // Extract the domain from the owner's email to claim it for the company
    const ownerDomain = ownerEmail.split('@')[1].toLowerCase();
    
    // Prevent generic email providers from claiming a company domain
    const genericDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    if (genericDomains.includes(ownerDomain)) {
        return res.status(400).json({ message: "Please register with a company email address." });
    }

    const existingOrgDomain = await Organization.findOne({ domain: ownerDomain });
    if (existingOrgDomain) return res.status(400).json({ message: "This company domain is already registered." });

    // Create the organization WITH the domain
    const organization = await Organization.create({ 
        name: companyName,
        domain: ownerDomain 
    });
    
    const hashedPassword = await bcrypt.hash(password, 10);

    const owner = await User.create({
      name: ownerName,
      email: ownerEmail,
      password: hashedPassword,
      role: 'Company_Owner',
      organizationId: organization._id 
    });

    const token = jwt.sign(
      { userId: owner._id, role: owner.role, organizationId: owner.organizationId },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(201).json({
      message: "Company and Owner created successfully",
      token,
      user: {
        _id: owner._id,
        name: owner.name,
        email: owner.email,
        role: owner.role,
        organizationId: owner.organizationId
      }
    });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
};

// --- 4. SECURE: Create Agent (Only Owners can do this) ---
const createAgent = async (req, res) => {
  try {
    // These come from your JWT Protect Middleware
    const ownerRole = req.user.role;
    const ownerOrgId = req.user.organizationId; 

    if (ownerRole !== 'Company_Owner') {
      return res.status(403).json({ message: "Only Company Owners can create Agents." });
    }

    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Force the Agent into the Owner's Organization
    const newAgent = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'Agent',
      organizationId: ownerOrgId 
    });

    res.status(201).json({
      message: "Agent hired successfully",
      agent: {
        _id: newAgent._id,
        name: newAgent.name,
        email: newAgent.email,
        role: newAgent.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const createCustomer = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: 'User already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("CREATOR:", req.user);
    const customer = await User.create({
      name,
      email,
      password: hashedPassword,

      role: 'Customer',

      organizationId: req.user.organizationId
    });
    console.log("CREATED CUSTOMER:", customer);
    res.status(201).json({
      success: true,
      customer
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Failed to create customer'
    });
  }
};
// --- 5. SECURE: Fetch Agents (Scoped by Organization) ---
const getAgents = async (req, res) => {
  try {
    const { role, organizationId } = req.user;

    let query = {
      role: 'Agent'
    };

    // Admin can see all agents
    if (role !== 'Admin') {
      query.organizationId = organizationId;
    }

    const agents = await User.find(query)
      .select('-password')
      .sort({ name: 1 });

    res.status(200).json(agents);

  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch agents',
      error: error.message
    });
  }
};

const getCustomers = async (req, res) => {
  try {
    const query = { role: 'Customer' };

    if (req.user.role !== 'Admin') {
      query.organizationId = req.user.organizationId;
    }
    console.log("REQ USER:", req.user);
    console.log("QUERY:", query);

    const customers = await User.find(query)
  .select('-password')
  .sort({ createdAt: -1 });

    console.log("FOUND CUSTOMERS:", customers);

    res.status(200).json(customers);

  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch customers',
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  getOrganizations,
  createAgent,
  createCustomer,
  getAgents,
  getCustomers,
  registerCompanyAndOwner
};