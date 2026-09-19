const fs = require('fs');
let code = fs.readFileSync('E:/New folder/Master-Server/TEXI/yatree-backend/src/controllers/authController.js', 'utf8');

const regex = /if \(!user\) \{\s*logError\(\`Login failed: User \[\$\{loginIdentifier\}\] not found in standard lookup\.\`\);\s*\/\/ Direct fallback exact match again just in case\s*user = await User\.findOne\(\{ username: loginIdentifier \}\)\.populate\('company'\);\s*if \(user && user\.isFreelancer !== true\) \{\s*logError\(\`WARNING: Fallback match worked for \[\$\{loginIdentifier\}\]\. Fixing auth flow\.\`\);\s*\} else \{\s*return res\.status\(401\)\.json\(\{ message: 'Invalid mobile or password' \}\);\s*\}\s*\}/;

const replacement = `if (!user) {
            logError(\`Login failed: User [\${loginIdentifier}] not found in standard lookup.\`);
            user = await User.findOne({ username: loginIdentifier }).populate('company');
            
            if (user && user.isFreelancer !== true) {
                logError(\`WARNING: Fallback match worked for [\${loginIdentifier}]. Fixing auth flow.\`);
            } else {
                // UNIVERSAL LOGIN CHECK (SSO)
                logError(\`[SSO] User not found in Main Fleet DB. Checking other CRMs...\`);
                
                // 1. Check School Management CRM
                if (process.env.MONGODB_URI_SCHOOL) {
                    try {
                        const schoolConn = await mongoose.createConnection(process.env.MONGODB_URI_SCHOOL).asPromise();
                        const SchoolUser = schoolConn.model('User', User.schema, 'users');
                        const schoolUser = await SchoolUser.findOne({
                            $or: [{ mobile: loginIdentifier }, { username: loginIdentifier }]
                        });
                        
                        if (schoolUser) {
                            // Check password
                            const isMatch = await schoolUser.matchPassword(password.trim());
                            if (isMatch) {
                                // Generate bridge token and redirect
                                const bridgeSecret = process.env.SUPER_ADMIN_BRIDGE_SECRET || 'fallback_bridge_secret';
                                const jwt = require('jsonwebtoken');
                                const bridgeToken = jwt.sign(
                                    { id: schoolUser._id, company: schoolUser.company, role: schoolUser.role }, 
                                    bridgeSecret, { expiresIn: '1h' }
                                );
                                const schoolUrl = process.env.SCHOOL_FRONTEND_URL || 'http://localhost:5175';
                                return res.json({ redirectUrl: \`\${schoolUrl}/bridge?token=\${bridgeToken}\` });
                            }
                        }
                    } catch (err) {
                        logError('[SSO ERROR] Failed to check School DB: ' + err.message);
                    }
                }

                // 2. Check Modified Fleet CRM
                if (process.env.MONGODB_URI_MODIFIED_FLEET) {
                    try {
                        const modConn = await mongoose.createConnection(process.env.MONGODB_URI_MODIFIED_FLEET).asPromise();
                        const ModUser = modConn.model('User', User.schema, 'users');
                        const modUser = await ModUser.findOne({
                            $or: [{ mobile: loginIdentifier }, { username: loginIdentifier }]
                        });
                        
                        if (modUser) {
                            const isMatch = await modUser.matchPassword(password.trim());
                            if (isMatch) {
                                const bridgeSecret = process.env.SUPER_ADMIN_BRIDGE_SECRET || 'fallback_bridge_secret';
                                const jwt = require('jsonwebtoken');
                                const bridgeToken = jwt.sign(
                                    { id: modUser._id, company: modUser.company, role: modUser.role }, 
                                    bridgeSecret, { expiresIn: '1h' }
                                );
                                const modUrl = process.env.MODIFIED_FLEET_FRONTEND_URL || 'http://localhost:5176';
                                return res.json({ redirectUrl: \`\${modUrl}/bridge?token=\${bridgeToken}\` });
                            }
                        }
                    } catch (err) {
                        logError('[SSO ERROR] Failed to check Modified Fleet DB: ' + err.message);
                    }
                }

                return res.status(401).json({ message: 'Invalid mobile or password' });
            }
        }`;

code = code.replace(regex, replacement);
fs.writeFileSync('E:/New folder/Master-Server/TEXI/yatree-backend/src/controllers/authController.js', code);
console.log('Modified yatree-backend authController.js for SSO');
