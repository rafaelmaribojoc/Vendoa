import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authenticate, AuthRequest } from "../middleware/auth";
import { generateSecurePassword, sendPasswordResetEmail } from "../services/email";

const router = Router();

// Login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: "Username and password are required",
      });
    }

    const user = await req.prisma.user.findUnique({
      where: { username },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      error: "Login failed",
    });
  }
});

// Get current user
router.get("/me", authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get user",
    });
  }
});

// Change password
router.post("/change-password", authenticate, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: "New password must be at least 6 characters",
      });
    }

    const user = await req.prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const isValidPassword = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: "Current password is incorrect",
      });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await req.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to change password",
    });
  }
});

// Update profile (username, email, fullName)
router.put("/profile", authenticate, async (req: AuthRequest, res) => {
  try {
    const { username, email, fullName } = req.body;

    // Check if username is taken by another user
    if (username) {
      const existingUser = await req.prisma.user.findFirst({
        where: {
          username,
          NOT: { id: req.user!.id },
        },
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: "Username is already taken",
        });
      }
    }

    // Check if email is taken by another user
    if (email) {
      const existingEmail = await req.prisma.user.findFirst({
        where: {
          email,
          NOT: { id: req.user!.id },
        },
      });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          error: "Email is already in use",
        });
      }
    }

    const updatedUser = await req.prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(username && { username }),
        ...(email && { email }),
        ...(fullName !== undefined && { fullName }),
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: updatedUser,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update profile",
    });
  }
});

// Forgot password - send new password to email
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email address is required",
      });
    }

    // Find user by email
    const user = await req.prisma.user.findFirst({
      where: { 
        email: email.toLowerCase(),
        isActive: true 
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "No account found with this email address",
      });
    }

    // Generate a new secure password
    const newPassword = generateSecurePassword(12);
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    await req.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    // Send the new password via email
    const emailSent = await sendPasswordResetEmail({
      to: user.email!,
      username: user.username,
      fullName: user.fullName,
      newPassword,
    });

    if (!emailSent) {
      // If email fails, still succeed but log it
      console.log("Password reset for user but email failed to send:");
      console.log(`  Username: ${user.username}`);
      console.log(`  New Password: ${newPassword}`);
    }

    res.json({
      success: true,
      message: "A new password has been sent to your email address",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to reset password",
    });
  }
});

export default router;
