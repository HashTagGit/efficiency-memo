import { Button, Card } from "@memo/ui";
import { APP_NAME } from "@memo/shared";

function App() {
 return (
 <div className="flex min-h-screen items-center justify-center bg-background p-8">
 <div className="w-full max-w-md space-y-6">
 <Card
 title={`${APP_NAME} Desktop`}
 description="A unified tool gallery for daily productivity"
 />
 <div className="flex justify-center">
 <Button variant="primary">Get Started</Button>
 </div>
 </div>
 </div>
 );
}

export default App;
