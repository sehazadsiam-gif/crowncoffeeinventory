import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import nodemailer from 'nodemailer';

export async function POST(req) {
  try {
    const body = await req.json();
    const { staff_id, staff_name, type, message } = body;

    if (!staff_id || !staff_name || !type || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Insert into Supabase
    const { data, error } = await supabase
      .from('staff_queries')
      .insert([
        {
          staff_id,
          staff_name,
          type,
          message,
          status: 'Pending'
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to insert query' }, { status: 500 });
    }

    // Send Email via Nodemailer (if environment variables are set)
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '465'),
          secure: true,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;

        const mailOptions = {
          from: `"Staff Portal" <${process.env.SMTP_USER}>`,
          to: adminEmail,
          subject: `New Staff Query: ${type} from ${staff_name}`,
          text: `You have a new query from ${staff_name}.\n\nType: ${type}\nMessage: ${message}\n\nPlease check the admin dashboard to respond.`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
              <h2 style="color: #2563eb;">New Staff Message (Inbox)</h2>
              <p><strong>From:</strong> ${staff_name}</p>
              <p><strong>Type:</strong> ${type}</p>
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 10px;">
                <p style="margin: 0; white-space: pre-wrap;">${message}</p>
              </div>
              <p style="margin-top: 20px;">
                <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin/queries" style="background-color: #2563eb; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Reply in Admin Dashboard</a>
              </p>
            </div>
          `,
        };

        await transporter.sendMail(mailOptions);
        console.log('Admin notification email sent successfully.');
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const { data, error } = await supabase
      .from('staff_queries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json();
    const { id, status, admin_reply } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('staff_queries')
      .update({ status, admin_reply })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
