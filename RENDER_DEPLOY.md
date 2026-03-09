# Table Tennis Tournament Manager - Render Configuration

This static website is optimized for deployment on Render as a Static Site.

## 🚀 Quick Deploy to Render

1. **Create a new GitHub repository** with these files
2. **Go to [Render](https://render.com)** and create a new Static Site
3. **Connect your GitHub repository**
4. **Use these settings:**
   - Build Command: `echo "Static site - no build needed"`
   - Publish Directory: `./`
   - Environment Variables: None required
5. **Click Deploy** - your site will be live in seconds!

## 📋 Render Configuration Files

### Procfile
The `Procfile` is included for compatibility, but Render Static Sites don't use it. Instead, configure your static site settings as shown above.

### Static Site Requirements
- No build process required
- No server-side processing
- Pure HTML/CSS/JavaScript
- Uses RESTful Table API for data persistence

## 🔧 Technical Details

### Hosting Type
This is a **Static Site** on Render, not a Web Service. Choose "Static Site" when creating your service.

### Build Settings
- **Build Command**: `echo "Static site - no build needed"`
- **Publish Directory**: `./` (root directory)
- **Install Dependencies**: None required

### Performance
- Optimized for static hosting
- No server-side processing
- Client-side data persistence via RESTful Table API
- Mobile-first responsive design

### Environment
- **Runtime**: Static file serving
- **Node Version**: Not applicable
- **Python Version**: Not applicable

## 🛠️ Troubleshooting

### Common Issues
1. **Wrong Service Type**: Make sure to select "Static Site" not "Web Service"
2. **Build Errors**: The build command should just echo a message
3. **Missing Files**: Ensure all files are committed to your repository

### Verification
After deployment, you should see:
- Live tournament dashboard
- Working fixtures generation
- Match result entry
- Real-time standings
- Mobile-responsive interface

## 📞 Support

For Render-specific issues:
1. Check Render documentation
2. Verify your repository is public (or connect private repo)
3. Ensure all files are committed
4. Check browser console for client-side errors

For application issues:
1. Check this README for usage instructions
2. Verify browser compatibility
3. Test with demo data first
4. Check JavaScript console for errors

---

**Your tournament manager is ready for Render deployment!** 🎉