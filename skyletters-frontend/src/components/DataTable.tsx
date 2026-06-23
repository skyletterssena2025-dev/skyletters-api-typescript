import { useMemo, useState, type ReactNode } from "react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";

export interface Column<T = any> {
  key: string;
  header: string;
  /** Render personalizado de la celda. Por defecto muestra row[key]. */
  render?: (row: T) => ReactNode;
  /** Valor usado para búsqueda/orden (por defecto row[key]). */
  value?: (row: T) => string | number;
  /** Alineación de la columna (números/moneda -> "right"). */
  align?: "left" | "right" | "center";
}

interface Props<T = any> {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  emptyText?: string;
  actions?: (row: T) => ReactNode;
  pageSize?: number;
}

export default function DataTable<T extends { id?: number | string }>({
  columns,
  rows,
  loading = false,
  emptyText = "Sin registros todavía.",
  actions,
  pageSize = 10,
}: Props<T>) {
  const [query, setQuery] = useState("");

  function cellValue(col: Column<T>, row: T): string | number {
    if (col.value) return col.value(row);
    const raw = (row as any)[col.key];
    return raw == null ? "" : raw;
  }

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((row) =>
      columns.some((c) => String(cellValue(c, row)).toLowerCase().includes(q)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, query, columns]);

  const gridColumns: GridColDef[] = useMemo(() => {
    const cols: GridColDef[] = columns.map((c) => ({
      field: c.key,
      headerName: c.header,
      flex: 1,
      minWidth: 120,
      align: c.align ?? "left",
      headerAlign: c.align ?? "left",
      valueGetter: (_value: any, row: any) => cellValue(c, row),
      renderCell: c.render ? (params) => <>{c.render!(params.row)}</> : undefined,
    }));
    if (actions) {
      cols.push({
        field: "__actions",
        headerName: "",
        width: 128,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        align: "right",
        renderCell: (params) => <>{actions(params.row)}</>,
      });
    }
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, actions]);

  return (
    <div className="datatable">
      <div className="dt-toolbar">
        <div className="dt-search">
          <i className="fa-solid fa-magnifying-glass" />
          <input placeholder="Buscar…" value={query} onChange={(e) => setQuery(e.target.value)} />
          {query && (
            <button className="dt-clear" onClick={() => setQuery("")} title="Limpiar búsqueda" aria-label="Limpiar búsqueda">
              <i className="fa-solid fa-xmark" />
            </button>
          )}
        </div>
      </div>

      <div className="grid-wrap">
        <DataGrid
          autoHeight
          rows={filtered}
          columns={gridColumns}
          loading={loading}
          getRowId={(r) => r.id}
          rowHeight={46}
          columnHeaderHeight={46}
          pageSizeOptions={[10, 20, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize } } }}
          disableRowSelectionOnClick
          localeText={{ noRowsLabel: emptyText }}
          sx={{
            border: "1px solid var(--border)",
            borderTop: "none",
            borderRadius: "0 0 var(--radius-md) var(--radius-md)",
            bgcolor: "var(--panel)",
            fontSize: 13.5,
            color: "var(--text)",
            "& .MuiDataGrid-columnHeaders": {
              minHeight: "46px",
              borderColor: "var(--border)",
            },
            "& .MuiDataGrid-columnHeader": { bgcolor: "var(--panel-2)" },
            "& .MuiDataGrid-columnHeaderTitle": {
              fontSize: 12,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              color: "var(--muted)",
            },
            "& .MuiDataGrid-cell": {
              borderColor: "var(--border)",
              display: "flex",
              alignItems: "center",
            },
            "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": { outline: "none" },
            "& .MuiDataGrid-columnSeparator": { display: "none" },
            "& .MuiDataGrid-row:hover": { bgcolor: "var(--accent-soft)" },
            "& .MuiDataGrid-row.Mui-selected": { bgcolor: "var(--accent-soft)" },
            "& .MuiDataGrid-footerContainer": {
              borderTop: "1px solid var(--border)",
              bgcolor: "var(--panel-2)",
            },
            "& .MuiTablePagination-root, & .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows":
              { color: "var(--muted)", fontSize: 13 },
            "& .MuiTablePagination-select, & .MuiTablePagination-selectIcon": { color: "var(--text)" },
            "& .MuiTablePagination-actions .MuiIconButton-root": { color: "var(--muted)" },
            "& .MuiTablePagination-actions .MuiIconButton-root.Mui-disabled": {
              color: "var(--border)",
            },
            "& .MuiDataGrid-overlay": { bgcolor: "var(--panel)", color: "var(--muted)" },
          }}
        />
      </div>
    </div>
  );
}
