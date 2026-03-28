import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'eventbooking.otp@gmail.com',
    pass: process.env.EMAIL_PASS || 'bcfr ckfv emwp vwbi'
  }
});

const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: '"MSAJCE Grievance Oracle" <eventbooking.otp@gmail.com>',
      to,
      subject,
      html
    });
    console.log('Email sent successfully to ' + to);
    return true;
  } catch (e) {
    console.error(`SMTP Error: ${e.message}`);
    return false;
  }
};

const getProfessionalEmailTemplate = (grvId, user, state, dept, isEmergency = false) => {
  const accentColor = isEmergency ? '#d32f2f' : '#1a73e8';
  const bgColor = '#f4f7f6';
  const cardColor = '#ffffff';
  const textColor = '#202124';
  const labelColor = '#5f6368';
  const borderColor = '#dadce0';

  const profilePhotoUrl = "https://imgs.search.brave.com/1xWoYBccqsvvI6tAIO2guAtDBBBk8BDXHeN2rQD1Dss/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tZWRp/YS5saWNkbi5jb20v/ZG1zL2ltYWdlL3Yy/L0Q0RDAzQVFGRVA3/akp1VzBIUXcvcHJv/ZmlsZS1kaXNwbGF5/cGhvdG8tc2hyaW5r/XzIwMF8yMDAvcHJv/ZmlsZS1kaXNwbGF5/cGhvdG8tc2hyaW5r/XzIwMF8yMDAvMC8x/NzI5NjA5Njc5ODc3/P2U9MjE0NzQ4MzY0/NyZ2PWJldGEmdD1U/TVdodHhCcFhLWU5h/WFlRS2JxNDI2bnFM/RU5QWjdtcldwcExU/Nm1rR3hZ";

  const urgencyLabel = isEmergency ? 'CRITICAL EMERGENCY' : 'Standard Grievance';

  const emergencyHeader = isEmergency ? `
    <div style="background-color: \${accentColor}; color: #ffffff; padding: 12px 20px; font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; text-align: center;">
       🚨 Priority Alert: Immediate Action Required
    </div>
  ` : '';

  return \`
    <div style="background-color: \${bgColor}; padding: 30px 15px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: \${textColor}; line-height: 1.5;">
      
      <div style="max-width: 600px; margin: 0 auto; background-color: \${cardColor}; border-radius: 8px; overflow: hidden; border: 1px solid \${borderColor}; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
        \${emergencyHeader}

        <!-- Header -->
        <div style="padding: 30px 40px 20px 40px; border-bottom: 2px solid #f1f3f4;">
           <table width="100%" cellpadding="0" cellspacing="0" border="0">
             <tr>
               <td style="vertical-align: middle;">
                 <h1 style="margin: 0; font-size: 20px; color: \${accentColor}; font-weight: 600;">MSAJCE Grievance Portal</h1>
                 <p style="margin: 4px 0 0 0; font-size: 13px; color: \${labelColor};">New Ticket Submitted for Review</p>
               </td>
               <td align="right" style="vertical-align: middle;">
                 <a href="https://www.linkedin.com/in/msajce/" target="_blank">
                   <img src="\${profilePhotoUrl}" alt="MSAJCE Logo" style="width: 48px; height: 48px; border-radius: 6px; border: 1px solid \${borderColor};" />
                 </a>
               </td>
             </tr>
           </table>
        </div>

        <div style="padding: 30px 40px;">

          <!-- Core Ticket Details -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 25px;">
            <tr>
              <td width="50%" style="padding-bottom: 15px;">
                <div style="font-size: 12px; color: \${labelColor}; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Ticket ID</div>
                <div style="font-size: 16px; font-weight: 600; color: \${textColor}; margin-top: 4px;">\${grvId}</div>
              </td>
              <td width="50%" style="padding-bottom: 15px;">
                <div style="font-size: 12px; color: \${labelColor}; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Routed Department</div>
                <div style="font-size: 16px; font-weight: 600; color: \${textColor}; margin-top: 4px;">\${dept}</div>
              </td>
            </tr>
            <tr>
              <td width="50%" style="padding-bottom: 5px;">
                <div style="font-size: 12px; color: \${labelColor}; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Category</div>
                <div style="font-size: 15px; color: \${textColor}; margin-top: 4px;">\${isEmergency ? state.incident_type : state.category}</div>
              </td>
              <td width="50%" style="padding-bottom: 5px;">
                <div style="font-size: 12px; color: \${labelColor}; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Priority Status</div>
                <div style="font-size: 13px; font-weight: 600; color: \${accentColor}; margin-top: 4px; display: inline-block; padding: 4px 10px; border-radius: 4px; background-color: \${isEmergency ? '#fdecea' : '#e8f0fe'};">\${urgencyLabel}</div>
              </td>
            </tr>
          </table>

          <!-- Description Box -->
          <div style="margin-bottom: 30px;">
            <div style="font-size: 13px; color: \${labelColor}; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; border-bottom: 1px solid \${borderColor}; padding-bottom: 8px; margin-bottom: 12px;">Issue Description</div>
            <div style="font-size: 15px; color: #3c4043; line-height: 1.6; background-color: #f8f9fa; padding: 18px; border-radius: 6px; border-left: 4px solid \${accentColor};">
              \${state.description}
              \${isEmergency && state.location ? \`
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed \${borderColor};">
                  <strong style="color: #d32f2f; font-size: 13px;">📍 LOCATION:</strong>
                  <span style="font-size: 14px; color: \${textColor}; margin-left: 4px;">\${state.location}</span>
                </div>
              \` : ''}
            </div>
          </div>

          <!-- Initiator Info -->
          <div>
            <div style="font-size: 13px; color: \${labelColor}; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; border-bottom: 1px solid \${borderColor}; padding-bottom: 8px; margin-bottom: 12px;">Initiator Details</div>
            <table width="100%" cellpadding="10" cellspacing="0" border="0" style="font-size: 14px; color: \${textColor};">
              <tr>
                <td style="width: 35%; color: \${labelColor}; border-bottom: 1px solid #f1f3f4; padding-left: 0;"><strong>Name</strong></td>
                <td style="width: 65%; border-bottom: 1px solid #f1f3f4;">\${state.is_anonymous ? '<span style="color: #80868b; font-style: italic;">Anonymous</span>' : (user?.name || 'Unknown')}</td>
              </tr>
              <tr>
                <td style="width: 35%; color: \${labelColor}; border-bottom: 1px solid #f1f3f4; padding-left: 0;"><strong>College ID</strong></td>
                <td style="width: 65%; border-bottom: 1px solid #f1f3f4;">\${state.is_anonymous ? '<span style="color: #80868b; font-style: italic;">Redacted</span>' : (user?.register_number || user?.employee_id || 'N/A')}</td>
              </tr>
              <tr>
                <td style="width: 35%; color: \${labelColor}; border-bottom: 1px solid #f1f3f4; padding-left: 0;"><strong>Department</strong></td>
                <td style="width: 65%; border-bottom: 1px solid #f1f3f4;">\${user?.department || 'N/A'}</td>
              </tr>
              <tr>
                <td style="width: 35%; color: \${labelColor}; border-bottom: 1px solid #f1f3f4; padding-left: 0;"><strong>Role</strong></td>
                <td style="width: 65%; border-bottom: 1px solid #f1f3f4; text-transform: capitalize;">\${user?.role || 'student'}</td>
              </tr>
              \${user?.phone && !state.is_anonymous ? \`
                <tr>
                  <td style="width: 35%; color: \${labelColor}; border-bottom: 1px solid #f1f3f4; padding-left: 0;"><strong>Contact</strong></td>
                  <td style="width: 65%; border-bottom: 1px solid #f1f3f4;"><a href="tel:\${user.phone}" style="color: #1a73e8; text-decoration: none;">\${user.phone}</a></td>
                </tr>
              \` : ''}
            </table>
          </div>

          <!-- Buttons -->
          <div style="text-align: center; margin-top: 35px;">
            <a href="https://telebot-ram.vercel.app/admin" style="display: inline-block; background-color: \${accentColor}; color: #ffffff; text-decoration: none; padding: 13px 32px; border-radius: 4px; font-weight: 500; font-size: 15px; letter-spacing: 0.5px;">Review Ticket</a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px 40px; text-align: center; border-top: 1px solid \${borderColor}; color: #80868b; font-size: 12px;">
          <p style="margin: 0 0 8px 0;">This email was securely processed by the MSAJCE Internal Oracle.</p>
          <p style="margin: 0;">
            <a href="https://www.linkedin.com/in/msajce/" target="_blank" style="color: #1a73e8; text-decoration: none;">MSAJCE Official LinkedIn</a>
            &nbsp;&nbsp;•&nbsp;&nbsp; © \${new Date().getFullYear()} MSAJCE
          </p>
        </div>

      </div>
    </div>
  \`;
};

async function run() {
  const adminEmail = 'cookwithcomali5@gmail.com';
  
  // Fake user data
  const user = {
    name: 'Suhas',
    register_number: '2019CSE044',
    department: 'Computer Science',
    role: 'student',
    phone: '+91-9876543210'
  };
  
  const state = {
    category: 'Network Issues',
    description: 'The Wi-Fi in the main auditorium has been constantly disconnecting since Monday morning. Please look into this promptly.',
    is_anonymous: false
  };

  await sendEmail(adminEmail, "[TEST V2] Professional Admin Grievance Notification", getProfessionalEmailTemplate('GRV-1033', user, state, 'IT Services', false));
  console.log("Tests sent to " + adminEmail);
}

run();
