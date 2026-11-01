export const DEFAULT_MARKETING_SUBJECT = "You're invited: {{eventName}}";

export const DEFAULT_MARKETING_HTML = `
<div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
  <div style="width: 100%; text-align: center; background-color: #f8fafc; line-height: 0;">
    <img src="{{emailHeader}}" alt="{{eventName}}" style="width: 100%; max-width: 100%; height: auto; display: block; margin: 0 auto; border: 0;" />
  </div>
  <div style="padding: 24px 28px; line-height: 1.6; font-size: 15px;">
    <p style="margin-top: 0; font-size: 16px;">Hello <strong>{{recipientName}}</strong>,</p>
    <p>You are cordially invited to participate in <strong>{{eventName}}</strong>.</p>
    <p style="color: #4b5563;">{{description}}</p>
    
    <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; border-radius: 6px; padding: 14px 18px; margin: 20px 0;">
      <p style="margin: 4px 0;"><strong>📅 Date:</strong> {{eventDate}}</p>
      <p style="margin: 4px 0;"><strong>⏰ Time:</strong> {{eventTime}}</p>
      <p style="margin: 4px 0;"><strong>📍 Venue:</strong> {{venue}}</p>
    </div>
    
    <div style="text-align: center; margin: 28px 0;">
      <a href="{{registrationLink}}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Register Here</a>
    </div>
    
    <p style="margin-bottom: 0;">We look forward to your enthusiastic participation!</p>
  </div>
  <!-- FOOTER WITH CLICKABLE SOCIAL LOGOS -->
  <div style="background-color: #f9fafb; padding: 20px 28px; border-top: 1px solid #e5e7eb; font-size: 13px; color: #6b7280; text-align: center;">
    <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 600; color: #374151; letter-spacing: 0.5px; text-transform: uppercase;">Connect with Us</p>
    <div style="text-align: center; margin-bottom: 12px;">
      <!-- WhatsApp Channel -->
      <a href="https://whatsapp.com/channel/0029VaA6ohD2kNFpm5oRiu1B" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin: 0 10px; text-decoration: none;" title="Join ACE WhatsApp Channel">
        <img src="https://res.cloudinary.com/swpljbm1/image/upload/v1788868873/whatsapp3-removebg-preview.png" alt="WhatsApp" width="32" height="32" style="width: 32px; height: 32px; vertical-align: middle; border: 0;" />
      </a>
      <!-- YouTube Channel -->
      <a href="https://www.youtube.com/@srkreclive8303" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin: 0 10px; text-decoration: none;" title="Subscribe to YouTube Channel">
        <img src="https://res.cloudinary.com/swpljbm1/image/upload/v1788865307/youtube-removebg-preview.png" alt="YouTube" width="32" height="32" style="width: 32px; height: 32px; vertical-align: middle; border: 0;" />
      </a>
      <!-- Instagram Profile -->
      <a href="https://www.instagram.com/srkr_ace?srtk=MTh5bmg2dWR4eG1qNQ==" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin: 0 10px; text-decoration: none;" title="Follow ACE on Instagram">
        <img src="https://res.cloudinary.com/swpljbm1/image/upload/v1788863475/instagram.png" alt="Instagram" width="32" height="32" style="width: 32px; height: 32px; vertical-align: middle; border: 0;" />
      </a>
    </div>
    <p style="margin: 0; font-size: 12px; color: #6b7280;">
      <strong>Association of Computer Engineers (ACE)</strong> &amp; <strong>SRKR ACM Student Chapter</strong>
    </p>
  </div>
</div>
`.trim();

export const DEFAULT_CERTIFICATE_SUBJECT = "Your Certificate for {{eventName}}";

export const DEFAULT_CERTIFICATE_HTML = `
<div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
  <div style="width: 100%; text-align: center; background-color: #f8fafc; line-height: 0;">
    <img src="{{emailHeader}}" alt="{{eventName}}" style="width: 100%; max-width: 100%; height: auto; display: block; margin: 0 auto; border: 0;" />
  </div>
  <div style="padding: 24px 28px; line-height: 1.6; font-size: 15px;">
    <p style="margin-top: 0; font-size: 16px;">Hello <strong>{{participantName}}</strong>,</p>
    <p>Thank you for participating in <strong>{{eventName}}</strong>!</p>
    
    <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; border-radius: 6px; padding: 14px 18px; margin: 20px 0;">
      <p style="margin: 0; color: #065f46; font-weight: 500;">
        🎉 Your certificate of participation has been generated and attached to this email as a PDF.
      </p>
    </div>
    
    <p>We appreciate your dedication and passion. We hope to see you again in our upcoming events and technical workshops.</p>
    <p style="margin-bottom: 0;">Best wishes for your future endeavors!</p>
  </div>
  <!-- FOOTER WITH CLICKABLE SOCIAL LOGOS -->
  <div style="background-color: #f9fafb; padding: 20px 28px; border-top: 1px solid #e5e7eb; font-size: 13px; color: #6b7280; text-align: center;">
    <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 600; color: #374151; letter-spacing: 0.5px; text-transform: uppercase;">Connect with Us</p>
    <div style="text-align: center; margin-bottom: 12px;">
      <!-- WhatsApp Channel -->
      <a href="https://whatsapp.com/channel/0029VaA6ohD2kNFpm5oRiu1B" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin: 0 10px; text-decoration: none;" title="Join ACE WhatsApp Channel">
        <img src="https://res.cloudinary.com/swpljbm1/image/upload/v1788868873/whatsapp3-removebg-preview.png" alt="WhatsApp" width="32" height="32" style="width: 32px; height: 32px; vertical-align: middle; border: 0;" />
      </a>
      <!-- YouTube Channel -->
      <a href="https://www.youtube.com/@srkreclive8303" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin: 0 10px; text-decoration: none;" title="Subscribe to YouTube Channel">
        <img src="https://res.cloudinary.com/swpljbm1/image/upload/v1788865307/youtube-removebg-preview.png" alt="YouTube" width="32" height="32" style="width: 32px; height: 32px; vertical-align: middle; border: 0;" />
      </a>
      <!-- Instagram Profile -->
      <a href="https://www.instagram.com/srkr_ace?srtk=MTh5bmg2dWR4eG1qNQ==" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin: 0 10px; text-decoration: none;" title="Follow ACE on Instagram">
        <img src="https://res.cloudinary.com/swpljbm1/image/upload/v1788863475/instagram.png" alt="Instagram" width="32" height="32" style="width: 32px; height: 32px; vertical-align: middle; border: 0;" />
      </a>
    </div>
    <p style="margin: 0; font-size: 12px; color: #6b7280;">
      <strong>Association of Computer Engineers (ACE)</strong> &amp; <strong>SRKR ACM Student Chapter</strong>
    </p>
  </div>
</div>
`.trim();
