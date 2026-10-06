using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Threading;
using System.Windows.Forms;

namespace AdelSalon
{
    static class CashierLauncher
    {
        private static bool IsPortOpen(int port)
        {
            try
            {
                using (var client = new TcpClient())
                {
                    var result = client.BeginConnect("127.0.0.1", port, null, null);
                    bool success = result.AsyncWaitHandle.WaitOne(400);
                    if (!success) return false;
                    client.EndConnect(result);
                    return true;
                }
            }
            catch
            {
                return false;
            }
        }

        private static void RunHidden(string workingDir, string command)
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo("cmd.exe", "/c " + command)
                {
                    WorkingDirectory = workingDir,
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    WindowStyle = ProcessWindowStyle.Hidden
                };
                Process.Start(psi);
            }
            catch (Exception ex)
            {
                MessageBox.Show("خطأ في تشغيل الخدمة: " + ex.Message, "خطأ في النظام", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        [STAThread]
        static void Main()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string apiDir = Path.Combine(baseDir, @"apps\api");
            string cashierDir = Path.Combine(baseDir, @"apps\cashier-desktop");

            // 1. Start backend if not running
            if (!IsPortOpen(3001))
            {
                RunHidden(apiDir, "npm run start:dev");
            }

            // 2. Start Cashier POS if not running
            if (!IsPortOpen(1420))
            {
                RunHidden(cashierDir, "npm run dev");
            }

            // Wait a few seconds for services to listen
            for (int i = 0; i < 15; i++)
            {
                if (IsPortOpen(1420)) break;
                Thread.Sleep(300);
            }

            // 3. Launch Edge in App POS Mode (or default browser)
            try
            {
                ProcessStartInfo edgePsi = new ProcessStartInfo("msedge.exe", "--app=http://localhost:1420 --window-size=1280,820")
                {
                    UseShellExecute = true
                };
                Process.Start(edgePsi);
            }
            catch
            {
                Process.Start("http://localhost:1420");
            }
        }
    }
}
