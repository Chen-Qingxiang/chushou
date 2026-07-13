import { lazy, Suspense } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { EvidenceProvider } from "./evidence";
import { Shell } from "./Shell";

const HomePage = lazy(async () => ({ default: (await import("./pages/HomePage")).HomePage }));
const TitlesPage = lazy(async () => ({ default: (await import("./pages/TitlesPage")).TitlesPage }));
const TitleDetailPage = lazy(async () => ({
  default: (await import("./pages/TitlesPage")).TitleDetailPage,
}));
const MapPage = lazy(async () => ({ default: (await import("./pages/SystemPages")).MapPage }));
const ReformsPage = lazy(async () => ({
  default: (await import("./pages/SystemPages")).ReformsPage,
}));
const CareerPage = lazy(async () => ({
  default: (await import("./pages/CareerPages")).CareerPage,
}));
const AppointmentDetailPage = lazy(async () => ({
  default: (await import("./pages/CareerPages")).AppointmentDetailPage,
}));
const MetricsPage = lazy(async () => ({
  default: (await import("./pages/CareerPages")).MetricsPage,
}));
const DecoderPage = lazy(async () => ({
  default: (await import("./pages/ExplorerPages")).DecoderPage,
}));
const ComparePage = lazy(async () => ({
  default: (await import("./pages/ExplorerPages")).ComparePage,
}));
const SourcesPage = lazy(async () => ({
  default: (await import("./pages/ExplorerPages")).SourcesPage,
}));
const SourceDetailPage = lazy(async () => ({
  default: (await import("./pages/ExplorerPages")).SourceDetailPage,
}));
const LearnPage = lazy(async () => ({
  default: (await import("./pages/ExplorerPages")).LearnPage,
}));
const SimulatorPage = lazy(async () => ({
  default: (await import("./pages/ExplorerPages")).SimulatorPage,
}));
const DataPage = lazy(async () => ({ default: (await import("./pages/ExplorerPages")).DataPage }));

function NotFoundPage() {
  return (
    <div className="page-container not-found">
      <span>404</span>
      <h1>这条路径尚未入图。</h1>
      <p>它可能是未发布的实体，或旧版 MVP 的锚点链接。</p>
      <Link className="button primary-button" to="/">
        返回首页
      </Link>
    </div>
  );
}

export function App() {
  return (
    <EvidenceProvider>
      <Shell>
        <Suspense
          fallback={
            <div className="route-loading" role="status">
              <span aria-hidden="true" /> 正在展开资料…
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/titles" element={<TitlesPage />} />
            <Route path="/titles/:slug" element={<TitleDetailPage />} />
            <Route path="/reforms" element={<ReformsPage />} />
            <Route path="/people/:personSlug/career" element={<CareerPage />} />
            <Route
              path="/people/:personSlug/appointments/:appointmentId"
              element={<AppointmentDetailPage />}
            />
            <Route path="/metrics" element={<MetricsPage />} />
            <Route path="/decoder" element={<DecoderPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/sources" element={<SourcesPage />} />
            <Route path="/sources/:sourceId" element={<SourceDetailPage />} />
            <Route path="/learn" element={<LearnPage />} />
            <Route path="/simulator" element={<SimulatorPage />} />
            <Route path="/data" element={<DataPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </Shell>
    </EvidenceProvider>
  );
}
