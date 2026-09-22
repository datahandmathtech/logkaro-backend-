const fs = require('fs');

function fixProtectedRoute(filePath) {
    if (!fs.existsSync(filePath)) return;
    let code = fs.readFileSync(filePath, 'utf8');

    // Replace the looping logic
    const oldLogic = `  if (role === 'Admin') {
    if (!isAdminOrExecutive) return <Navigate to="/driver" replace />;
  } else if (role === 'Driver') {
    if (user.role !== 'Driver') return <Navigate to="/admin" replace />;
  } else if (role === 'Staff') {
    if (user.role !== 'Staff') return <Navigate to="/admin" replace />;
  }`;

    const newLogic = `  if (role === 'Admin') {
    if (!isAdminOrExecutive) return <Navigate to="/login" replace />;
  } else if (role === 'Driver') {
    if (userRole !== 'driver') return <Navigate to="/login" replace />;
  } else if (role === 'Staff') {
    if (userRole !== 'staff') return <Navigate to="/login" replace />;
  }`;

    if (code.includes("if (!isAdminOrExecutive) return <Navigate to=\"/driver\" replace />;")) {
        code = code.replace(oldLogic, newLogic);
        fs.writeFileSync(filePath, code);
        console.log('Fixed ProtectedRoute in', filePath);
    }
}

fixProtectedRoute('E:/New folder/Master-Server/TEXI/Stundent-m/school-frontend/src/App.jsx');
fixProtectedRoute('D:/Abhinandan/yatree-frontend-/src/App.jsx');
fixProtectedRoute('E:/New folder/Master-Server/TEXI/yatree-frontend-/src/App.jsx');

