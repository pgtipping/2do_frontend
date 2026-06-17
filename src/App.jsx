import React from "react";
import AuthGate from "./finance/auth/AuthGate";
import FinanceImportScreen from "./finance/components/FinanceImportScreen";

function App() {
  return (
    <AuthGate>
      <FinanceImportScreen />
    </AuthGate>
  );
}

export default App;
