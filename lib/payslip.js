export async function generatePayslipPDF(staffData, payrollData) {
  const { jsPDF } = require('jspdf')
  const html2canvas = require('html2canvas').default
  
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  
  const payslipHTML = `
    <div id="payslip-container" style="font-family: 'Segoe UI', sans-serif; padding: 40px; max-width: 800px; background: #FAFAFA; color: #1C1410;">
      
      <!-- Header Section -->
      <div style="text-align: center; margin-bottom: 40px; border-bottom: 3px solid #6B3A2A; padding-bottom: 24px;">
        <div style="font-size: 28px; font-weight: 800; color: #1F1F1F; letter-spacing: -0.5px; margin-bottom: 4px;">CROWN COFFEE</div>
        <div style="font-size: 13px; color: #9C8A76; text-transform: uppercase; letter-spacing: 1px;">Monthly Pay Slip</div>
        <div style="font-size: 12px; color: #C9943A; margin-top: 8px;">${months[payrollData.month - 1]} ${payrollData.year}</div>
      </div>

      <!-- Employee Information -->
      <div style="background: #FFFFFF; border: 1px solid #E0E0E0; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
          <div>
            <div style="font-size: 11px; color: #9C8A76; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 6px;">Employee Name</div>
            <div style="font-size: 15px; font-weight: 700; color: #1F1F1F;">${staffData.name || staffData.full_name}</div>
          </div>
          <div>
            <div style="font-size: 11px; color: #9C8A76; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 6px;">Employee ID</div>
            <div style="font-size: 15px; font-weight: 700; color: #1F1F1F;">${staffData.id}</div>
          </div>
          <div>
            <div style="font-size: 11px; color: #9C8A76; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 6px;">Designation</div>
            <div style="font-size: 15px; font-weight: 700; color: #1F1F1F;">${staffData.designation || staffData.designation_editable || 'N/A'}</div>
          </div>
          <div>
            <div style="font-size: 11px; color: #9C8A76; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 6px;">Days Worked</div>
            <div style="font-size: 15px; font-weight: 700; color: #1F1F1F;">${payrollData.present_days} days</div>
          </div>
        </div>
      </div>

      <!-- Earnings Section -->
      <div style="margin-bottom: 24px;">
        <div style="background: #2E7D32; color: white; padding: 12px 16px; border-radius: 8px 8px 0 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">EARNINGS</div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #E0E0E0;">
            <td style="padding: 16px; font-size: 14px;">Base Salary</td>
            <td style="padding: 16px; text-align: right; font-size: 14px; font-weight: 700; color: #1F1F1F;">৳ ${payrollData.base_salary.toLocaleString('en-BD')}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E0E0E0;">
            <td style="padding: 16px; font-size: 14px;">Overtime Pay</td>
            <td style="padding: 16px; text-align: right; font-size: 14px; font-weight: 700; color: #1F1F1F;">৳ ${(payrollData.overtime_pay || 0).toLocaleString('en-BD')}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E0E0E0;">
            <td style="padding: 16px; font-size: 14px;">Morning Shift Food (8 AM / 11 AM)</td>
            <td style="padding: 16px; text-align: right; font-size: 14px; font-weight: 700; color: #1F1F1F;">৳ ${(payrollData.morning_food || 0).toLocaleString('en-BD')}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E0E0E0;">
            <td style="padding: 16px; font-size: 14px;">Night Shift Food (1 PM)</td>
            <td style="padding: 16px; text-align: right; font-size: 14px; font-weight: 700; color: #1F1F1F;">৳ ${(payrollData.lunch_dinner || 0).toLocaleString('en-BD')}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E0E0E0;">
            <td style="padding: 16px; font-size: 14px;">Service Charge</td>
            <td style="padding: 16px; text-align: right; font-size: 14px; font-weight: 700; color: #1F1F1F;">৳ ${(payrollData.service_charge || 0).toLocaleString('en-BD')}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E0E0E0;">
            <td style="padding: 16px; font-size: 14px;">Bonus</td>
            <td style="padding: 16px; text-align: right; font-size: 14px; font-weight: 700; color: #1F1F1F;">৳ ${(payrollData.bonus || 0).toLocaleString('en-BD')}</td>
          </tr>
          <tr style="background: #F5F5F5;">
            <td style="padding: 16px; font-size: 13px; font-weight: 700; text-transform: uppercase; color: #1F1F1F;">Total Earnings</td>
            <td style="padding: 16px; text-align: right; font-size: 14px; font-weight: 800; color: #2E7D32;">৳ ${(payrollData.total_earnings || 0).toLocaleString('en-BD')}</td>
          </tr>
        </table>
      </div>

      <!-- Deductions Section -->
      <div style="margin-bottom: 24px;">
        <div style="background: #D32F2F; color: white; padding: 12px 16px; border-radius: 8px 8px 0 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">DEDUCTIONS</div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #E0E0E0;">
            <td style="padding: 16px; font-size: 14px;">Unpaid Leave Deduction</td>
            <td style="padding: 16px; text-align: right; font-size: 14px; font-weight: 700; color: #1F1F1F;">৳ ${(payrollData.unpaid_leave_deduction || 0).toLocaleString('en-BD')}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E0E0E0;">
            <td style="padding: 16px; font-size: 14px;">Late Deduction (${payrollData.late_days || 0} days ÷ 3)</td>
            <td style="padding: 16px; text-align: right; font-size: 14px; font-weight: 700; color: #1F1F1F;">৳ ${(payrollData.late_deduction || 0).toLocaleString('en-BD')}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E0E0E0;">
            <td style="padding: 16px; font-size: 14px;">Advance</td>
            <td style="padding: 16px; text-align: right; font-size: 14px; font-weight: 700; color: #1F1F1F;">৳ ${(payrollData.advance || 0).toLocaleString('en-BD')}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E0E0E0;">
            <td style="padding: 16px; font-size: 14px;">Others</td>
            <td style="padding: 16px; text-align: right; font-size: 14px; font-weight: 700; color: #1F1F1F;">৳ ${(payrollData.others || 0).toLocaleString('en-BD')}</td>
          </tr>
          <tr style="background: #F5F5F5;">
            <td style="padding: 16px; font-size: 13px; font-weight: 700; text-transform: uppercase; color: #1F1F1F;">Total Deductions</td>
            <td style="padding: 16px; text-align: right; font-size: 14px; font-weight: 800; color: #D32F2F;">৳ ${(payrollData.total_deductions || 0).toLocaleString('en-BD')}</td>
          </tr>
        </table>
      </div>

      <!-- Net Salary -->
      <div style="background: linear-gradient(135deg, #6B3A2A 0%, #8B5E3C 100%); color: white; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px;">
          <div>
            <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9; margin-bottom: 6px;">Total Earnings</div>
            <div style="font-size: 20px; font-weight: 800;">৳ ${(payrollData.total_earnings || 0).toLocaleString('en-BD')}</div>
          </div>
          <div>
            <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9; margin-bottom: 6px;">Total Deductions</div>
            <div style="font-size: 20px; font-weight: 800;">৳ ${(payrollData.total_deductions || 0).toLocaleString('en-BD')}</div>
          </div>
        </div>
        <div style="border-top: 2px solid rgba(255,255,255,0.3); padding-top: 16px; margin-top: 16px;">
          <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9; margin-bottom: 8px;">NET SALARY</div>
          <div style="font-size: 32px; font-weight: 900; letter-spacing: -1px;">৳ ${payrollData.final_salary.toLocaleString('en-BD')}</div>
        </div>
      </div>

      <!-- Payment History -->
      <div style="background: #FFFFFF; border: 1px solid #E0E0E0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; color: #1F1F1F; letter-spacing: 0.5px; margin-bottom: 16px;">Payment History</div>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid #E0E0E0;">
              <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 700; color: #9C8A76; text-transform: uppercase; letter-spacing: 0.5px;">Date</th>
              <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 700; color: #9C8A76; text-transform: uppercase; letter-spacing: 0.5px;">Amount</th>
              <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 700; color: #9C8A76; text-transform: uppercase; letter-spacing: 0.5px;">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${payrollData.payments && payrollData.payments.length > 0 ? payrollData.payments.map(p => `
              <tr style="border-bottom: 1px solid #E0E0E0;">
                <td style="padding: 12px; font-size: 14px;">${new Date(p.payment_date).toLocaleDateString()}</td>
                <td style="padding: 12px; text-align: right; font-size: 14px; font-weight: 700;">৳ ${p.amount.toLocaleString('en-BD')}</td>
                <td style="padding: 12px; text-align: right; font-size: 14px; font-weight: 700; color: #2E7D32;">৳ ${p.balance.toLocaleString('en-BD')}</td>
              </tr>
            `).join('') : `
              <tr style="border-bottom: 1px solid #E0E0E0;">
                <td colspan="3" style="padding: 16px; text-align: center; color: #9C8A76; font-size: 14px;">No payments recorded</td>
              </tr>
            `}
          </tbody>
        </table>
      </div>

      <!-- Footer -->
      <div style="text-align: center; border-top: 1px solid #E0E0E0; padding-top: 20px;">
        <div style="font-size: 11px; color: #9C8A76; line-height: 1.6;">
          Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}<br>
          This is an electronically generated payslip and is valid without signature.
        </div>
      </div>
    </div>
  `

  // Create temporary hidden div to render the HTML
  const container = document.createElement('div')
  container.id = 'temp-payslip-render'
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.innerHTML = payslipHTML
  document.body.appendChild(container)

  try {
    const canvas = await html2canvas(container.querySelector('#payslip-container'), { 
      scale: 2,
      useCORS: true,
      backgroundColor: '#FAFAFA'
    })
    const imgData = canvas.toDataURL('image/png')
    
    const pdf = new jsPDF('p', 'mm', 'a4')
    const imgWidth = 210
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
    pdf.save(`Payslip_${staffData.name || staffData.full_name}_${payrollData.month}_${payrollData.year}.pdf`)
  } catch (error) {
    console.error('PDF Generation failed:', error)
  } finally {
    document.body.removeChild(container)
  }
}
