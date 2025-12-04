-- Add confirmation email template
INSERT INTO email_templates (template_key, template_name, subject, html_content, default_html_content, description)
VALUES (
  'confirmation_email',
  'Email di Conferma',
  '✉️ Conferma il tuo account Lovable Connect',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Conferma Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%);">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">💌 Lovable Connect</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; text-align: center;">Conferma il tuo Account</h2>
              <p style="margin: 0 0 30px; color: #6b7280; font-size: 16px; line-height: 1.6; text-align: center;">
                Grazie per esserti registrato su Lovable Connect! Clicca il pulsante qui sotto per confermare il tuo indirizzo email e attivare il tuo account.
              </p>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="{{confirmLink}}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; font-size: 18px; font-weight: bold; border-radius: 50px; box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);">
                      ✅ Conferma Email
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0; color: #9ca3af; font-size: 14px; text-align: center;">
                Se non hai creato un account, puoi ignorare questa email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © 2024 Lovable Connect. Tutti i diritti riservati.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Conferma Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%);">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">💌 Lovable Connect</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; text-align: center;">Conferma il tuo Account</h2>
              <p style="margin: 0 0 30px; color: #6b7280; font-size: 16px; line-height: 1.6; text-align: center;">
                Grazie per esserti registrato su Lovable Connect! Clicca il pulsante qui sotto per confermare il tuo indirizzo email e attivare il tuo account.
              </p>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="{{confirmLink}}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; font-size: 18px; font-weight: bold; border-radius: 50px; box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);">
                      ✅ Conferma Email
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0; color: #9ca3af; font-size: 14px; text-align: center;">
                Se non hai creato un account, puoi ignorare questa email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © 2024 Lovable Connect. Tutti i diritti riservati.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  'Email inviata per confermare l''account dopo la registrazione'
)
ON CONFLICT (template_key) DO UPDATE SET 
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content;

-- Add reset password email template  
INSERT INTO email_templates (template_key, template_name, subject, html_content, default_html_content, description)
VALUES (
  'reset_password',
  'Reset Password',
  '🔐 Reimposta la tua password - Lovable Connect',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%);">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🔐 Lovable Connect</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; text-align: center;">Reimposta la tua Password</h2>
              <p style="margin: 0 0 30px; color: #6b7280; font-size: 16px; line-height: 1.6; text-align: center;">
                Hai richiesto di reimpostare la password del tuo account. Clicca il pulsante qui sotto per procedere.
              </p>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="{{resetLink}}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; font-size: 18px; font-weight: bold; border-radius: 50px; box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);">
                      🔄 Reimposta Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0; color: #9ca3af; font-size: 14px; text-align: center;">
                Se non hai richiesto il reset della password, puoi ignorare questa email. Il link scadrà tra 24 ore.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © 2024 Lovable Connect. Tutti i diritti riservati.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%);">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🔐 Lovable Connect</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; text-align: center;">Reimposta la tua Password</h2>
              <p style="margin: 0 0 30px; color: #6b7280; font-size: 16px; line-height: 1.6; text-align: center;">
                Hai richiesto di reimpostare la password del tuo account. Clicca il pulsante qui sotto per procedere.
              </p>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="{{resetLink}}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; font-size: 18px; font-weight: bold; border-radius: 50px; box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);">
                      🔄 Reimposta Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0; color: #9ca3af; font-size: 14px; text-align: center;">
                Se non hai richiesto il reset della password, puoi ignorare questa email. Il link scadrà tra 24 ore.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © 2024 Lovable Connect. Tutti i diritti riservati.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  'Email inviata per reimpostare la password'
)
ON CONFLICT (template_key) DO UPDATE SET 
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content;